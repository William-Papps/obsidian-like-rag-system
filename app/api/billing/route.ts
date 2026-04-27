import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuthenticatedUser } from "@/lib/auth";
import { getBillingState, saveBillingState } from "@/lib/services/billing";
import { getProviderSettings } from "@/lib/services/settings";

export const dynamic = "force-dynamic";

const schema = z.object({
  billingName: z.string().nullable().optional(),
  billingEmail: z.string().email().nullable().optional(),
  plan: z.enum(["free", "starter", "pro"])
});

export async function GET() {
  return withAuthenticatedUser(async (user) =>
    NextResponse.json({
      billing: await getBillingState(user.id),
      settings: await getProviderSettings(user.id)
    })
  );
}

export async function POST(request: Request) {
  return withAuthenticatedUser(async (user) => {
    const body = schema.parse(await request.json());
    const billing = await saveBillingState(user.id, body);
    return NextResponse.json({
      billing,
      settings: await getProviderSettings(user.id)
    });
  });
}
