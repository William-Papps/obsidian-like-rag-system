import crypto from "crypto";
import { dbAll, dbGet, dbRun } from "@/lib/db";
import type { Workspace, WorkspaceMember, WorkspaceMemberRole, WorkspaceWithMembers } from "@/lib/types";
import { id, now } from "@/lib/utils";

function tokenHash(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export async function createWorkspace(userId: string, name: string, description?: string): Promise<Workspace> {
  const workspace: Workspace = {
    id: id(),
    name: name.trim(),
    ownerUserId: userId,
    description: description?.trim() || null,
    createdAt: now(),
    updatedAt: now()
  };
  await dbRun(
    "insert into workspaces (id, name, owner_user_id, description, created_at, updated_at) values (?, ?, ?, ?, ?, ?)",
    [workspace.id, workspace.name, workspace.ownerUserId, workspace.description, workspace.createdAt, workspace.updatedAt]
  );
  // Add owner as a member
  await dbRun(
    "insert into workspace_members (id, workspace_id, user_id, role, joined_at, created_at) values (?, ?, ?, ?, ?, ?)",
    [id(), workspace.id, userId, "owner", now(), now()]
  );
  return workspace;
}

export async function listUserWorkspaces(userId: string): Promise<WorkspaceWithMembers[]> {
  const workspaceRows = await dbAll<{
    id: string; name: string; owner_user_id: string; description: string | null; created_at: string; updated_at: string; role: string;
  }>(
    `select w.*, wm.role
     from workspaces w
     join workspace_members wm on wm.workspace_id = w.id and wm.user_id = ?
     order by w.created_at asc`,
    [userId]
  );
  return Promise.all(workspaceRows.map(async (row) => {
    const members = await listWorkspaceMembers(row.id);
    return {
      id: row.id,
      name: row.name,
      ownerUserId: row.owner_user_id,
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      members,
      currentUserRole: row.role as WorkspaceMemberRole
    };
  }));
}

export async function getWorkspaceForUser(workspaceId: string, userId: string): Promise<WorkspaceWithMembers | null> {
  const row = await dbGet<{
    id: string; name: string; owner_user_id: string; description: string | null; created_at: string; updated_at: string; role: string;
  }>(
    `select w.*, wm.role
     from workspaces w
     join workspace_members wm on wm.workspace_id = w.id and wm.user_id = ?
     where w.id = ?`,
    [userId, workspaceId]
  );
  if (!row) return null;
  const members = await listWorkspaceMembers(workspaceId);
  return {
    id: row.id,
    name: row.name,
    ownerUserId: row.owner_user_id,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    members,
    currentUserRole: row.role as WorkspaceMemberRole
  };
}

export async function listWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  const rows = await dbAll<{
    workspace_id: string; user_id: string; email: string; name: string; role: string; joined_at: string | null; created_at: string;
  }>(
    `select wm.workspace_id, wm.user_id, u.email, u.name, wm.role, wm.joined_at, wm.created_at
     from workspace_members wm
     join users u on u.id = wm.user_id
     where wm.workspace_id = ?
     order by wm.created_at asc`,
    [workspaceId]
  );
  return rows.map((r) => ({
    workspaceId: r.workspace_id,
    userId: r.user_id,
    email: r.email,
    name: r.name,
    role: r.role as WorkspaceMemberRole,
    joinedAt: r.joined_at,
    createdAt: r.created_at
  }));
}

export async function isWorkspaceMember(workspaceId: string, userId: string): Promise<boolean> {
  const row = await dbGet("select 1 from workspace_members where workspace_id = ? and user_id = ?", [workspaceId, userId]);
  return Boolean(row);
}

export async function updateWorkspace(workspaceId: string, userId: string, data: { name?: string; description?: string }): Promise<Workspace | null> {
  const row = await dbGet<{ id: string; name: string; owner_user_id: string; description: string | null; created_at: string }>(
    "select * from workspaces where id = ? and owner_user_id = ?",
    [workspaceId, userId]
  );
  if (!row) return null;
  const name = data.name?.trim() || row.name;
  const description = data.description !== undefined ? (data.description.trim() || null) : row.description;
  const updated = now();
  await dbRun(
    "update workspaces set name = ?, description = ?, updated_at = ? where id = ?",
    [name, description, updated, workspaceId]
  );
  return { id: row.id, name, ownerUserId: row.owner_user_id, description, createdAt: row.created_at, updatedAt: updated };
}

export async function deleteWorkspace(workspaceId: string, userId: string): Promise<boolean> {
  const row = await dbGet("select 1 from workspaces where id = ? and owner_user_id = ?", [workspaceId, userId]);
  if (!row) return false;
  // Detach notes from workspace instead of deleting them — they stay as personal notes of original author
  await dbRun("update notes set workspace_id = null where workspace_id = ?", [workspaceId]);
  await dbRun("update folders set workspace_id = null where workspace_id = ?", [workspaceId]);
  await dbRun("delete from workspaces where id = ?", [workspaceId]);
  return true;
}

export async function removeMember(workspaceId: string, targetUserId: string, requestingUserId: string): Promise<boolean> {
  // Owner can remove anyone except themselves; members can only remove themselves
  const workspace = await dbGet<{ owner_user_id: string }>("select owner_user_id from workspaces where id = ?", [workspaceId]);
  if (!workspace) return false;
  const isOwner = workspace.owner_user_id === requestingUserId;
  const isSelf = targetUserId === requestingUserId;
  if (!isOwner && !isSelf) return false;
  if (isOwner && targetUserId === requestingUserId) return false; // owner cannot remove themselves
  await dbRun("delete from workspace_members where workspace_id = ? and user_id = ?", [workspaceId, targetUserId]);
  return true;
}

// ── Invite flow ───────────────────────────────────────────────────────────────

export async function createInvite(workspaceId: string, invitedByUserId: string, email: string): Promise<{ token: string; inviteId: string }> {
  const token = crypto.randomBytes(32).toString("hex");
  const hash = tokenHash(token);
  const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(); // 7 days
  const inviteId = id();
  // Revoke any previous unused invite for this email+workspace
  await dbRun(
    "delete from workspace_invites where workspace_id = ? and email = ? and consumed_at is null",
    [workspaceId, email.toLowerCase().trim()]
  );
  await dbRun(
    "insert into workspace_invites (id, workspace_id, invited_by_user_id, email, token_hash, expires_at, created_at) values (?, ?, ?, ?, ?, ?, ?)",
    [inviteId, workspaceId, invitedByUserId, email.toLowerCase().trim(), hash, expiresAt, now()]
  );
  return { token, inviteId };
}

export type InviteInfo = {
  inviteId: string;
  workspaceId: string;
  workspaceName: string;
  invitedByName: string;
  email: string;
  expiresAt: string;
};

export async function lookupInvite(token: string): Promise<InviteInfo | null> {
  const hash = tokenHash(token);
  const row = await dbGet<{
    id: string; workspace_id: string; workspace_name: string; invited_by_name: string; email: string; expires_at: string; consumed_at: string | null;
  }>(
    `select wi.id, wi.workspace_id, w.name as workspace_name, u.name as invited_by_name, wi.email, wi.expires_at, wi.consumed_at
     from workspace_invites wi
     join workspaces w on w.id = wi.workspace_id
     join users u on u.id = wi.invited_by_user_id
     where wi.token_hash = ?`,
    [hash]
  );
  if (!row) return null;
  if (row.consumed_at) return null;
  if (new Date(row.expires_at) < new Date()) return null;
  return {
    inviteId: row.id,
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    invitedByName: row.invited_by_name,
    email: row.email,
    expiresAt: row.expires_at
  };
}

export async function consumeInvite(token: string, userId: string): Promise<{ workspaceId: string; workspaceName: string } | null> {
  const info = await lookupInvite(token);
  if (!info) return null;
  // Add to members if not already
  const existing = await isWorkspaceMember(info.workspaceId, userId);
  if (!existing) {
    await dbRun(
      "insert into workspace_members (id, workspace_id, user_id, role, joined_at, created_at) values (?, ?, ?, ?, ?, ?)",
      [id(), info.workspaceId, userId, "editor", now(), now()]
    );
  }
  // Mark consumed
  await dbRun("update workspace_invites set consumed_at = ? where id = ?", [now(), info.inviteId]);
  return { workspaceId: info.workspaceId, workspaceName: info.workspaceName };
}
