import { dbAll, dbGet, dbRun } from "@/lib/db";
import { getBillingState, setHostedAccessGranted, setSubscriptionPlan } from "@/lib/services/billing";
import { setHostedPlan } from "@/lib/services/settings";
import type { AdminUserSummary, ManagedUser, HostedPlan, UserRole } from "@/lib/types";
import { now, toCamelRecord } from "@/lib/utils";

export async function listManagedUsers(): Promise<AdminUserSummary[]> {
  const rows = await dbAll(
    `select u.*, coalesce(ps.hosted_plan, 'free') as hosted_plan, coalesce(s.status, 'free') as subscription_status, s.hosted_access_granted_at
     from users u
     left join provider_settings ps on ps.user_id = u.id and ps.provider = 'openai'
     left join subscriptions s on s.user_id = u.id
     order by u.created_at desc`
  );
  return rows.map((row) => toCamelRecord(row) as AdminUserSummary);
}

export async function getManagedUser(userId: string): Promise<ManagedUser | null> {
  const row = await dbGet("select * from users where id = ?", [userId]);
  return row ? (toCamelRecord(row) as ManagedUser) : null;
}

export async function updateUserRole(userId: string, role: UserRole) {
  await dbRun("update users set role = ?, updated_at = ? where id = ?", [role, now(), userId]);
}

export async function setUserDisabled(userId: string, disabled: boolean) {
  await dbRun("update users set disabled_at = ?, updated_at = ? where id = ?", [disabled ? now() : null, now(), userId]);
}

export async function deleteUserAccount(userId: string) {
  await dbRun("delete from users where id = ?", [userId]);
}

export async function adminSetUserPlan(userId: string, plan: HostedPlan) {
  await setSubscriptionPlan(userId, plan, plan === "free" ? "free" : "manual");
  await setHostedPlan(userId, plan);
  return getBillingState(userId);
}

export async function adminSetHostedAccess(userId: string, granted: boolean) {
  await setHostedAccessGranted(userId, granted);
}
