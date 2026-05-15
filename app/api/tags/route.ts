import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuthenticatedUser } from "@/lib/auth";
import { createTag, listTags } from "@/lib/services/tags";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().trim().min(1).max(40),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional()
});

export async function GET() {
  return withAuthenticatedUser(async (user) => {
    return NextResponse.json(await listTags(user.id));
  });
}

export async function POST(request: Request) {
  return withAuthenticatedUser(async (user) => {
    try {
      const body = createSchema.parse(await request.json());
      const tag = await createTag(user.id, body.name, body.color);
      return NextResponse.json(tag, { status: 201 });
    } catch (error) {
      console.error("[tags] createTag failed:", error);
      return NextResponse.json({ error: "Failed to create tag" }, { status: 400 });
    }
  });
}
