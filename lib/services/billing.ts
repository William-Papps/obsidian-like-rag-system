import { dbGet, dbRun } from "@/lib/db";
import { setHostedPlan } from "@/lib/services/settings";
import type { BillingProfile, BillingState, BillingSubscription, BillingSubscriptionStatus, HostedPlan } from "@/lib/types";
import { id, now, toCamelRecord } from "@/lib/utils";

type UserRow = {
  id: string;
  email: string;
  name: string;
};

export async function getBillingState(userId: string): Promise<BillingState> {
  const user = await dbGet<UserRow>("select id, email, name from users where id = ?", [userId]);
  if (!user) throw new Error("User not found");

  const profileRow = await dbGet("select * from billing_profiles where user_id = ?", [userId]);
  const profile = profileRow ? publicProfile(profileRow) : await createBillingProfile(user);

  const subscriptionRow = await dbGet("select * from subscriptions where user_id = ?", [userId]);
  const subscription = subscriptionRow ? publicSubscription(subscriptionRow) : await createSubscription(userId);
  return {
    profile,
    subscription,
    hostedAccessGranted: Boolean(subscription.hostedAccessGrantedAt),
    checkoutReady: false,
    portalReady: false
  };
}

export async function saveBillingState(
  userId: string,
  input: {
    billingName?: string | null;
    billingEmail?: string | null;
    plan: HostedPlan;
  }
) {
  const existing = await getBillingState(userId);
  const billingName = input.billingName?.trim() || null;
  const billingEmail = input.billingEmail?.trim().toLowerCase() || null;

  await dbRun("update billing_profiles set billing_name = ?, billing_email = ?, updated_at = ? where id = ? and user_id = ?", [
    billingName,
    billingEmail,
    now(),
    existing.profile.id,
    userId
  ]);

  const nextPlan = normalizePlan(input.plan);
  await setSubscriptionPlan(userId, nextPlan, subscriptionStatus(nextPlan));
  return getBillingState(userId);
}

export async function setSubscriptionPlan(userId: string, plan: HostedPlan, status: BillingSubscriptionStatus) {
  const existing = await getBillingState(userId);
  const nextPlan = normalizePlan(plan);
  const planChanged = existing.subscription.plan !== nextPlan;
  const periodStart = nextPlan === "free" ? null : planChanged || !existing.subscription.currentPeriodStart ? now() : existing.subscription.currentPeriodStart;
  const periodEnd = nextPlan === "free" ? null : addDays(periodStart!, 30);
  const provider = nextPlan === "free" ? "none" : status === "manual" ? "manual" : "stripe";

  await dbRun(
    "update subscriptions set plan = ?, status = ?, provider = ?, current_period_start = ?, current_period_end = ?, cancel_at_period_end = 0, updated_at = ? where id = ? and user_id = ?",
    [nextPlan, status, provider, periodStart, periodEnd, now(), existing.subscription.id, userId]
  );
  await setHostedPlan(userId, nextPlan);
}

function publicProfile(row: Record<string, unknown>): BillingProfile {
  return toCamelRecord(row) as BillingProfile;
}

function publicSubscription(row: Record<string, unknown>): BillingSubscription {
  const subscription = toCamelRecord(row) as BillingSubscription & { cancelAtPeriodEnd: number | boolean };
  return {
    ...subscription,
    plan: normalizePlan(subscription.plan),
    status: normalizeStatus(subscription.status),
    provider: normalizeProvider(subscription.provider),
    cancelAtPeriodEnd: Boolean(subscription.cancelAtPeriodEnd)
  };
}

async function createBillingProfile(user: UserRow): Promise<BillingProfile> {
  const createdAt = now();
  const profile: BillingProfile = {
    id: id(),
    userId: user.id,
    billingName: user.name,
    billingEmail: user.email,
    createdAt,
    updatedAt: createdAt
  };
  await dbRun(
    "insert into billing_profiles (id, user_id, billing_name, billing_email, created_at, updated_at) values (?, ?, ?, ?, ?, ?)",
    [profile.id, profile.userId, profile.billingName, profile.billingEmail, profile.createdAt, profile.updatedAt]
  );
  return profile;
}

async function createSubscription(userId: string): Promise<BillingSubscription> {
  const createdAt = now();
  const subscription: BillingSubscription = {
    id: id(),
    userId,
    plan: "free",
    status: "free",
    provider: "none",
    providerCustomerId: null,
    providerSubscriptionId: null,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    hostedAccessGrantedAt: null,
    createdAt,
    updatedAt: createdAt
  };
  await dbRun(
    "insert into subscriptions (id, user_id, plan, status, provider, provider_customer_id, provider_subscription_id, current_period_start, current_period_end, cancel_at_period_end, hosted_access_granted_at, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [
      subscription.id,
      subscription.userId,
      subscription.plan,
      subscription.status,
      subscription.provider,
      subscription.providerCustomerId,
      subscription.providerSubscriptionId,
      subscription.currentPeriodStart,
      subscription.currentPeriodEnd,
      0,
      subscription.hostedAccessGrantedAt,
      subscription.createdAt,
      subscription.updatedAt
    ]
  );
  return subscription;
}

export async function userCanUseHostedAi(userId: string) {
  const user = await dbGet<{ role: string }>("select role from users where id = ?", [userId]);
  if (!user) return false;
  if (user.role === "owner" || user.role === "admin") return true;
  const subscription = await dbGet<{ hosted_access_granted_at: string | null }>("select hosted_access_granted_at from subscriptions where user_id = ?", [userId]);
  return Boolean(subscription?.hosted_access_granted_at);
}

export async function setHostedAccessGranted(userId: string, granted: boolean) {
  await dbRun("update subscriptions set hosted_access_granted_at = ?, updated_at = ? where user_id = ?", [granted ? now() : null, now(), userId]);
}

function normalizePlan(plan: HostedPlan | string | undefined | null): HostedPlan {
  return plan === "starter" || plan === "pro" ? plan : "free";
}

function normalizeStatus(status: BillingSubscriptionStatus | string | undefined | null): BillingSubscriptionStatus {
  return status === "manual" || status === "pending_provider" || status === "inactive" || status === "canceled" ? status : "free";
}

function normalizeProvider(provider: string | undefined | null): BillingSubscription["provider"] {
  return provider === "manual" || provider === "stripe" ? provider : "none";
}

function subscriptionStatus(plan: HostedPlan): BillingSubscriptionStatus {
  return plan === "free" ? "free" : "manual";
}

function addDays(iso: string, days: number) {
  const date = new Date(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}
