import { NextResponse } from "next/server";
import { getCurrentUserOptional } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUserOptional();
  return NextResponse.json({ authenticated: Boolean(user), user: user ? { id: user.id, email: user.email, role: user.role } : null }, { headers: { "cache-control": "no-store" } });
}

