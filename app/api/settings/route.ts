import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getProviderSettings, saveProviderSettings } from "@/lib/services/settings";

export const dynamic = "force-dynamic";

const schema = z.object({
  apiKey: z.string().optional(),
  projectId: z.string().nullable().optional(),
  embeddingModel: z.string().min(1),
  answerModel: z.string().min(1),
  visionModel: z.string().nullable().optional()
});

export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json(await getProviderSettings(user.id));
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const body = schema.parse(await request.json());
  return NextResponse.json(await saveProviderSettings(user.id, body));
}
