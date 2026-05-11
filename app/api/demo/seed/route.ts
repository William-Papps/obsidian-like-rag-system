import { NextResponse } from "next/server";
import { withAuthenticatedUser } from "@/lib/auth";
import { listNotes } from "@/lib/services/notes";
import { seedDemoNotes } from "@/lib/services/demo-notes";

export const dynamic = "force-dynamic";

export async function POST() {
  return withAuthenticatedUser(async (user) => {
    const existing = await listNotes(user.id);
    if (existing.length > 0) {
      return NextResponse.json({ ok: true, skipped: true });
    }
    await seedDemoNotes(user.id);
    return NextResponse.json({ ok: true, skipped: false });
  });
}
