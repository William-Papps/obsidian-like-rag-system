import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuthenticatedUser } from "@/lib/auth";
import { createWorkspace, listUserWorkspaces } from "@/lib/services/workspaces";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional()
});

export async function GET() {
  return withAuthenticatedUser(async (user) => {
    const workspaces = await listUserWorkspaces(user.id);
    return NextResponse.json(workspaces);
  });
}

export async function POST(request: Request) {
  return withAuthenticatedUser(async (user) => {
    const body = createSchema.parse(await request.json());
    const workspace = await createWorkspace(user.id, body.name, body.description);
    return NextResponse.json(workspace, { status: 201 });
  });
}
