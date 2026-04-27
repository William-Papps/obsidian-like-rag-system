import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuthenticatedUser } from "@/lib/auth";
import { createFolder, listFolders } from "@/lib/services/folders";

export const dynamic = "force-dynamic";

const schema = z.object({ name: z.string().min(1), parentId: z.string().nullable().optional() });

export async function GET() {
  return withAuthenticatedUser(async (user) => NextResponse.json(await listFolders(user.id)));
}

export async function POST(request: Request) {
  return withAuthenticatedUser(async (user) => {
    const body = schema.parse(await request.json());
    return NextResponse.json(await createFolder(user.id, body.name, body.parentId ?? null), { status: 201 });
  });
}
