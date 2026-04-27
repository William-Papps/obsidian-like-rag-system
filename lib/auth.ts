import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { dbGet, dbRun } from "@/lib/db";
import { sendVerificationEmail, verificationTtlMinutes } from "@/lib/email";
import { logAudit } from "@/lib/services/audit";
import { getRuntimeSettings } from "@/lib/services/runtime-settings";
import type { UserRole } from "@/lib/types";
import { id, now, sha256 } from "@/lib/utils";

const scrypt = promisify(scryptCallback);
const SESSION_COOKIE = "studyos_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  disabledAt: string | null;
};

type SessionRow = CurrentUser & {
  session_id: string;
  expires_at: string;
  email_verified_at: string | null;
};

type UserRow = CurrentUser & {
  password_hash: string | null;
  email_verified_at: string | null;
};

export class AuthError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "AuthError";
  }
}

export class VerificationRequiredError extends Error {
  email: string;
  debugCode?: string | null;

  constructor(email: string, message = "Verify your email before signing in.", debugCode?: string | null) {
    super(message);
    this.name = "VerificationRequiredError";
    this.email = email;
    this.debugCode = debugCode;
  }
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) throw new AuthError();

  const session = await dbGet<SessionRow>(
    `select users.id, users.email, users.name, users.role, users.disabled_at as disabledAt, users.email_verified_at, sessions.id as session_id, sessions.expires_at
     from sessions
     join users on users.id = sessions.user_id
     where sessions.token_hash = ?`,
    [sessionTokenHash(token)]
  );

  const verificationRequired = await emailVerificationEnabled();
  if (!session || session.disabledAt || (verificationRequired && !session.email_verified_at) || new Date(session.expires_at).getTime() <= Date.now()) {
    await clearSessionCookie();
    throw new AuthError();
  }

  await dbRun("update sessions set last_used_at = ? where id = ?", [now(), session.session_id]);
  const role = effectiveRole(String(session.email), session.role);
  return {
    id: String(session.id),
    email: String(session.email),
    name: String(session.name),
    role,
    disabledAt: session.disabledAt ? String(session.disabledAt) : null
  };
}

export async function getCurrentUserOptional(): Promise<CurrentUser | null> {
  try {
    return await getCurrentUser();
  } catch (error) {
    if (error instanceof AuthError) return null;
    throw error;
  }
}

export async function withAuthenticatedUser<T>(handler: (user: CurrentUser) => Promise<T>) {
  try {
    const user = await getCurrentUser();
    return await handler(user);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 }) as T;
    }
    throw error;
  }
}

export async function registerUser(input: { email: string; name: string; password: string }) {
  if (!(await selfSignupEnabled())) throw new AuthError("Registration is disabled.");

  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const password = input.password.trim();

  const existing = await dbGet<UserRow>(
    "select id, email, name, role, disabled_at as disabledAt, password_hash, email_verified_at from users where email = ?",
    [email]
  );
  if (existing?.disabledAt) throw new Error("This account is disabled.");
  if (existing?.password_hash && existing.email_verified_at) throw new Error("An account with that email already exists.");

  if (existing) {
    const verifiedAt = (await emailVerificationEnabled()) ? null : now();
    await dbRun("update users set name = ?, password_hash = ?, email_verified_at = ?, role = ?, updated_at = ? where id = ?", [
      name,
      await hashPassword(password),
      verifiedAt,
      ownerRoleForEmail(email),
      now(),
      existing.id
    ]);
    if (await emailVerificationEnabled()) {
      const verification = await issueEmailVerification({ userId: existing.id, email: existing.email, name });
      await logAudit({ actorUserId: existing.id, event: "auth.register.pending_verification", metadata: { email } });
      return { user: { id: existing.id, email: existing.email, name, role: ownerRoleForEmail(email), disabledAt: null }, verificationRequired: true as const, debugCode: verification.debugCode ?? null };
    }
    await createSession(existing.id);
    await logAudit({ actorUserId: existing.id, event: "auth.register.completed", metadata: { email } });
    return { user: { id: existing.id, email: existing.email, name, role: ownerRoleForEmail(email), disabledAt: null } };
  }

  const user = { id: id(), email, name, role: ownerRoleForEmail(email) };
  const verifiedAt = (await emailVerificationEnabled()) ? null : now();
  await dbRun(
    "insert into users (id, email, name, password_hash, email_verified_at, role, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?)",
    [user.id, user.email, user.name, await hashPassword(password), verifiedAt, user.role, now(), now()]
  );
  if (await emailVerificationEnabled()) {
    const verification = await issueEmailVerification({ userId: user.id, email: user.email, name: user.name });
    await logAudit({ actorUserId: user.id, event: "auth.register.pending_verification", metadata: { email } });
    return { user: { ...user, disabledAt: null }, verificationRequired: true as const, debugCode: verification.debugCode ?? null };
  }
  await createSession(user.id);
  await logAudit({ actorUserId: user.id, event: "auth.register.completed", metadata: { email } });
  return { user: { ...user, disabledAt: null } };
}

export async function loginUser(input: { email: string; password: string }) {
  const email = input.email.trim().toLowerCase();
  const verificationRequired = await emailVerificationEnabled();
  const user = await dbGet<UserRow>(
    "select id, email, name, role, disabled_at as disabledAt, password_hash, email_verified_at from users where email = ?",
    [email]
  );

  if (!user?.password_hash) throw new AuthError("Invalid email or password.");
  if (user.disabledAt) throw new AuthError("This account is disabled.");
  const valid = await verifyPassword(input.password, user.password_hash);
  if (!valid) throw new AuthError("Invalid email or password.");
  if (verificationRequired && !user.email_verified_at) {
    const verification = await issueEmailVerification({ userId: user.id, email: user.email, name: user.name });
    throw new VerificationRequiredError(user.email, "Verify your email before signing in.", verification.debugCode ?? null);
  }
  if (!verificationRequired && !user.email_verified_at) {
    await dbRun("update users set email_verified_at = ?, updated_at = ? where id = ?", [now(), now(), user.id]);
  }
  const role = effectiveRole(user.email, user.role);
  if (role !== normalizeRole(user.role)) {
    await dbRun("update users set role = ?, updated_at = ? where id = ?", [role, now(), user.id]);
  }

  await createSession(user.id);
  await logAudit({ actorUserId: user.id, event: "auth.login.success" });
  return { id: user.id, email: user.email, name: user.name, role, disabledAt: user.disabledAt ?? null };
}

export async function logoutUser() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await dbRun("delete from sessions where token_hash = ?", [sessionTokenHash(token)]);
  }
  await clearSessionCookie();
}

export async function changePassword(userId: string, input: { currentPassword: string; newPassword: string }) {
  const user = await dbGet<{ password_hash: string | null }>("select password_hash from users where id = ?", [userId]);
  if (!user?.password_hash) throw new AuthError("Current password is invalid.");

  const valid = await verifyPassword(input.currentPassword, user.password_hash);
  if (!valid) throw new AuthError("Current password is invalid.");

  await dbRun("update users set password_hash = ?, updated_at = ? where id = ?", [
    await hashPassword(input.newPassword),
    now(),
    userId
  ]);

  return { ok: true };
}

export async function verifyEmailCode(input: { email: string; code: string }) {
  const email = input.email.trim().toLowerCase();
  const user = await dbGet<UserRow>("select id, email, name, role, disabled_at as disabledAt, password_hash, email_verified_at from users where email = ?", [email]);
  if (!user) throw new AuthError("Verification request is invalid.");
  if (user.disabledAt) throw new AuthError("This account is disabled.");
  if (user.email_verified_at) {
    await createSession(user.id);
    return { user: { id: user.id, email: user.email, name: user.name, role: effectiveRole(user.email, user.role), disabledAt: user.disabledAt ?? null } };
  }

  const verification = await dbGet<{ id: string; code_hash: string; expires_at: string }>(
    `select id, code_hash, expires_at
     from email_verifications
     where user_id = ? and email = ? and consumed_at is null
     order by created_at desc
     limit 1`,
    [user.id, email]
  );
  if (!verification) throw new AuthError("No active verification code was found. Request a new code.");
  if (new Date(verification.expires_at).getTime() <= Date.now()) {
    throw new AuthError("This verification code has expired. Request a new code.");
  }
  if (sha256(normalizeVerificationCode(input.code)) !== String(verification.code_hash)) {
    throw new AuthError("Verification code is incorrect.");
  }

  await dbRun("update email_verifications set consumed_at = ?, updated_at = ? where id = ?", [now(), now(), verification.id]);
  await dbRun("update users set email_verified_at = ?, updated_at = ? where id = ?", [now(), now(), user.id]);
  await createSession(user.id);
  await logAudit({ actorUserId: user.id, event: "auth.email_verified" });
  return { user: { id: user.id, email: user.email, name: user.name, role: effectiveRole(user.email, user.role), disabledAt: user.disabledAt ?? null } };
}

export async function resendVerificationCode(emailInput: string) {
  const email = emailInput.trim().toLowerCase();
  const user = await dbGet<UserRow>("select id, email, name, password_hash, email_verified_at from users where email = ?", [email]);
  if (!user) throw new AuthError("No account exists for that email.");
  if (user.email_verified_at) throw new AuthError("This account is already verified.");

  const verification = await issueEmailVerification({ userId: user.id, email: user.email, name: user.name });
  return { email: user.email, debugCode: verification.debugCode ?? null };
}

export async function selfSignupEnabled() {
  return (await getRuntimeSettings()).selfSignupEnabled;
}

export async function emailVerificationEnabled() {
  return (await getRuntimeSettings()).emailVerificationEnabled;
}

export function isAdmin(user: CurrentUser) {
  return user.role === "admin" || user.role === "owner";
}

async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  await dbRun("delete from sessions where user_id = ? and expires_at <= ?", [userId, now()]);
  await dbRun(
    "insert into sessions (id, user_id, token_hash, expires_at, created_at, last_used_at) values (?, ?, ?, ?, ?, ?)",
    [id(), userId, sessionTokenHash(token), expiresAt, now(), now()]
  );

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt)
  });
}

async function clearSessionCookie() {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0)
  });
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${hash.toString("hex")}`;
}

async function verifyPassword(password: string, storedHash: string) {
  const [scheme, salt, expectedHex] = storedHash.split(":");
  if (scheme !== "scrypt" || !salt || !expectedHex) return false;
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(expectedHex, "hex");
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

function sessionTokenHash(token: string) {
  return sha256(`${process.env.AUTH_SESSION_SECRET || "studyos-dev-session-secret"}:${token}`);
}

function ownerRoleForEmail(email: string): UserRole {
  const owner = (process.env.OWNER_EMAIL?.trim() || "discordboteternal@gmail.com").toLowerCase();
  return owner && owner === email.toLowerCase() ? "owner" : "user";
}

function effectiveRole(email: string, value: unknown): UserRole {
  return ownerRoleForEmail(email) === "owner" ? "owner" : normalizeRole(value);
}

function normalizeRole(value: unknown): UserRole {
  return value === "owner" || value === "admin" ? value : "user";
}

async function issueEmailVerification(input: { userId: string; email: string; name: string }) {
  const code = createVerificationCode();
  await dbRun("update email_verifications set consumed_at = ?, updated_at = ? where user_id = ? and email = ? and consumed_at is null", [
    now(),
    now(),
    input.userId,
    input.email
  ]);
  await dbRun(
    "insert into email_verifications (id, user_id, email, code_hash, expires_at, consumed_at, created_at, updated_at) values (?, ?, ?, ?, ?, null, ?, ?)",
    [id(), input.userId, input.email, sha256(code), verificationExpiresAt(), now(), now()]
  );
  return sendVerificationEmail({ email: input.email, name: input.name, code });
}

function createVerificationCode() {
  return `${Math.floor(100000 + Math.random() * 900000)}`;
}

function verificationExpiresAt() {
  return new Date(Date.now() + verificationTtlMinutes() * 60 * 1000).toISOString();
}

function normalizeVerificationCode(code: string) {
  return code.replace(/\s+/g, "").trim();
}
