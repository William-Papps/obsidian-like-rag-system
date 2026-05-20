import { dbAll, dbGet, dbRun } from "@/lib/db";
import type { AdminUserSummary, ManagedUser, UserRole } from "@/lib/types";
import { now, toCamelRecord } from "@/lib/utils";

export async function listManagedUsers(): Promise<AdminUserSummary[]> {
  const rows = await dbAll(
    `select u.*,
       coalesce((select sum(au.count) from ai_usage au where au.user_id = u.id and au.period = strftime('%Y-%m', 'now')), 0) as ai_usage_this_month
     from users u
     order by u.created_at desc`
  );
  return rows.map((row) => toCamelRecord(row) as AdminUserSummary);
}

export async function getManagedUser(userId: string): Promise<ManagedUser | null> {
  const row = await dbGet("select * from users where id = ?", [userId]);
  return row ? (toCamelRecord(row) as ManagedUser) : null;
}

function ownerEmail() {
  return (process.env.OWNER_EMAIL?.trim() || "discordboteternal@gmail.com").toLowerCase();
}

function isOwnerRow(row: { email?: string | null } | null) {
  return Boolean(row?.email && String(row.email).toLowerCase() === ownerEmail());
}

export async function updateUserRole(userId: string, role: UserRole) {
  const user = await getManagedUser(userId);
  if (isOwnerRow(user)) throw new Error("The owner account role cannot be changed.");
  await dbRun("update users set role = ?, updated_at = ? where id = ?", [role, now(), userId]);
}

export async function setUserDisabled(userId: string, disabled: boolean) {
  if (disabled) {
    const user = await getManagedUser(userId);
    if (isOwnerRow(user)) throw new Error("The owner account cannot be disabled.");
  }
  await dbRun("update users set disabled_at = ?, updated_at = ? where id = ?", [disabled ? now() : null, now(), userId]);
}

export async function deleteUserAccount(userId: string) {
  const user = await getManagedUser(userId);
  if (isOwnerRow(user)) throw new Error("The owner account cannot be deleted.");
  await dbRun("delete from users where id = ?", [userId]);
}

