import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin, withAuthenticatedUser } from "@/lib/auth";
import { dbAll, dbRun } from "@/lib/db";
import { id, now } from "@/lib/utils";

export const dynamic = "force-dynamic";

const submitSchema = z.object({
  category: z.enum(["bug", "feature", "general"]).default("general"),
  message: z.string().min(1).max(2000)
});

export async function POST(request: Request) {
  return withAuthenticatedUser(async (user) => {
    const body = submitSchema.parse(await request.json());
    await dbRun(
      "insert into user_feedback (id, user_id, category, message, created_at) values (?, ?, ?, ?, ?)",
      [id(), user.id, body.category, body.message, now()]
    );
    return NextResponse.json({ ok: true });
  });
}

export async function GET() {
  return withAuthenticatedUser(async (user) => {
    if (!isAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const rows = await dbAll<{
      id: string;
      user_id: string;
      name: string;
      email: string;
      category: string;
      message: string;
      created_at: string;
    }>(
      `select f.id, f.user_id,
              coalesce(u.name, 'Deleted user') as name,
              coalesce(u.email, '') as email,
              f.category, f.message, f.created_at
       from user_feedback f
       left join users u on u.id = f.user_id
       order by f.created_at desc
       limit 200`
    );
    return NextResponse.json({ feedback: rows });
  });
}
