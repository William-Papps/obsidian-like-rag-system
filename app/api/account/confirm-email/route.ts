import { NextResponse } from "next/server";
import { withAuthenticatedUser } from "@/lib/auth";
import { dbGet, dbRun } from "@/lib/db";
import { now, sha256 } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return withAuthenticatedUser(async (user) => {
    const { code } = (await request.json()) as { code?: string };
    if (!code?.trim()) {
      return NextResponse.json({ error: "Verification code is required." }, { status: 400 });
    }

    const userRow = await dbGet<{ pending_email: string | null }>(
      "SELECT pending_email FROM users WHERE id = ?",
      [user.id]
    );
    if (!userRow?.pending_email) {
      return NextResponse.json({ error: "No pending email change found." }, { status: 400 });
    }

    const pendingEmail = userRow.pending_email;

    const verification = await dbGet<{ id: string; expires_at: string; consumed_at: string | null; code_hash: string }>(
      "SELECT id, expires_at, consumed_at, code_hash FROM email_verifications WHERE user_id = ? AND email = ? AND consumed_at IS NULL ORDER BY created_at DESC LIMIT 1",
      [user.id, pendingEmail]
    );

    if (!verification) {
      return NextResponse.json({ error: "No active verification code found. Request a new code." }, { status: 400 });
    }
    if (new Date(verification.expires_at).getTime() <= Date.now()) {
      return NextResponse.json({ error: "Verification code has expired. Request a new code." }, { status: 400 });
    }
    if (sha256(code.replace(/\s+/g, "").trim()) !== verification.code_hash) {
      return NextResponse.json({ error: "Verification code is incorrect." }, { status: 400 });
    }

    // Consume the verification and apply the email change atomically
    await dbRun(
      "UPDATE email_verifications SET consumed_at = ?, updated_at = ? WHERE id = ?",
      [now(), now(), verification.id]
    );
    await dbRun(
      "UPDATE users SET email = ?, pending_email = NULL, updated_at = ? WHERE id = ?",
      [pendingEmail, now(), user.id]
    );

    return NextResponse.json({ email: pendingEmail });
  });
}
