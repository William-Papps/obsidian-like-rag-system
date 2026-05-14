import { NextResponse } from "next/server";
import { withAuthenticatedUser } from "@/lib/auth";
import { getBillingState } from "@/lib/services/billing";
import { appUrl, stripeClient } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST() {
  return withAuthenticatedUser(async (user) => {
    const billing = await getBillingState(user.id);
    const customerId = billing.subscription.providerCustomerId;
    if (!customerId) {
      return NextResponse.json({ error: "No billing account found. Subscribe first." }, { status: 400 });
    }

    const stripe = stripeClient();
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl()}/account?section=billing`
    });

    return NextResponse.json({ url: session.url });
  });
}
