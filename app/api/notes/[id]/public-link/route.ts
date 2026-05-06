import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { withAuthenticatedUser } from "@/lib/auth";
import { dbGet, dbRun } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuthenticatedUser(async (user) => {
    const { id } = await params;
    const row = await dbGet<{ public_token: string | null }>(
      "select public_token from notes where id = ? and user_id = ?",
      [id, user.id]
    );
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ token: row.public_token ?? null });
  });
}

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuthenticatedUser(async (user) => {
    const { id } = await params;
    const exists = await dbGet("select id from notes where id = ? and user_id = ?", [id, user.id]);
    if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const token = randomBytes(18).toString("base64url");
    await dbRun("update notes set public_token = ? where id = ?", [token, id]);
    return NextResponse.json({ token });
  });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuthenticatedUser(async (user) => {
    const { id } = await params;
    const exists = await dbGet("select id from notes where id = ? and user_id = ?", [id, user.id]);
    if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await dbRun("update notes set public_token = null where id = ?", [id]);
    return NextResponse.json({ ok: true });
  });
}
