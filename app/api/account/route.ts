import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuthenticatedUser, logoutUserWithResponse } from "@/lib/auth";
import { deleteUserAccount } from "@/lib/services/users";
import { dbGet, dbRun } from "@/lib/db";
import { now, id, sha256 } from "@/lib/utils";
import { sendEmailChangeVerification, verificationTtlMinutes } from "@/lib/email";

export const dynamic = "force-dynamic";

const profileSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  email: z.string().email().optional(),
});

function createVerificationCode() {
  return `${Math.floor(100000 + Math.random() * 900000)}`;
}

function verificationExpiresAt() {
  return new Date(Date.now() + verificationTtlMinutes() * 60 * 1000).toISOString();
}

export async function PATCH(request: Request) {
  return withAuthenticatedUser(async (user) => {
    const body = profileSchema.parse(await request.json());

    // Apply name change immediately
    if (body.name && body.name !== user.name) {
      await dbRun(
        "UPDATE users SET name = ?, updated_at = ? WHERE id = ?",
        [body.name, now(), user.id]
      );
    }

    // Email change requires verification — store as pending and send code
    if (body.email && body.email.toLowerCase() !== user.email) {
      const newEmail = body.email.toLowerCase();

      const existing = await dbGet<{ id: string }>(
        "SELECT id FROM users WHERE email = ? AND id != ?",
        [newEmail, user.id]
      );
      if (existing) {
        return NextResponse.json({ error: "That email address is already in use." }, { status: 409 });
      }

      // Invalidate any previous pending email verifications for this user
      await dbRun(
        "UPDATE email_verifications SET consumed_at = ?, updated_at = ? WHERE user_id = ? AND consumed_at IS NULL",
        [now(), now(), user.id]
      );

      const code = createVerificationCode();
      await dbRun(
        "INSERT INTO email_verifications (id, user_id, email, code_hash, expires_at, consumed_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NULL, ?, ?)",
        [id(), user.id, newEmail, sha256(code), verificationExpiresAt(), now(), now()]
      );
      await dbRun("UPDATE users SET pending_email = ?, updated_at = ? WHERE id = ?", [newEmail, now(), user.id]);

      const { debugCode } = await sendEmailChangeVerification({ email: newEmail, name: body.name ?? user.name, code });

      return NextResponse.json({
        name: body.name ?? user.name,
        email: user.email,
        pendingEmail: newEmail,
        ...(debugCode ? { debugCode } : {})
      });
    }

    const updatedName = body.name ?? user.name;
    return NextResponse.json({ name: updatedName, email: user.email });
  });
}

export async function DELETE(request: Request) {
  return withAuthenticatedUser(async (user) => {
    const body = await request.json().catch(() => ({})) as { confirm?: string };
    if (body.confirm !== user.email) {
      return NextResponse.json({ error: "Confirmation email does not match." }, { status: 400 });
    }
    try {
      await deleteUserAccount(user.id);
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Deletion failed." }, { status: 400 });
    }
    return logoutUserWithResponse(request, NextResponse.json({ ok: true }));
  });
}
