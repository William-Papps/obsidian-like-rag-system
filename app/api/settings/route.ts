import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuthenticatedUser } from "@/lib/auth";
import { getProviderSettings, saveProviderSettings } from "@/lib/services/settings";

export const dynamic = "force-dynamic";

const schema = z.object({
  apiKey: z.string().optional(),
  clearApiKey: z.boolean().optional(),
  projectId: z.string().nullable().optional(),
  embeddingModel: z.string().min(1),
  answerModel: z.string().min(1),
  visionModel: z.string().nullable().optional(),
  hostedPlan: z.enum(["free", "starter", "pro"]).optional()
});

export async function GET() {
  return withAuthenticatedUser(async (user) => NextResponse.json(await getProviderSettings(user.id)));
}

export async function POST(request: Request) {
  return withAuthenticatedUser(async (user) => {
    const body = schema.parse(await request.json());
    return NextResponse.json(await saveProviderSettings(user.id, body));
  });
}
