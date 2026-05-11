import { NextResponse } from "next/server";
import { withAuthenticatedUser, logoutUserWithResponse } from "@/lib/auth";
import { deleteUserAccount } from "@/lib/services/users";

export const dynamic = "force-dynamic";

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
