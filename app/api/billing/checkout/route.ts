import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuthenticatedUser } from "@/lib/auth";
import { getBillingState, setStripeIds } from "@/lib/services/billing";
import { appUrl, planPriceId, stripeClient } from "@/lib/stripe";

export const dynamic = "force-dynamic";

const schema = z.object({ plan: z.enum(["starter", "pro"]) });

export async function POST(request: Request) {
  return withAuthenticatedUser(async (user) => {
    const body = schema.parse(await request.json());
    const stripe = stripeClient();
    const billing = await getBillingState(user.id);

    // Block if already on an active paid subscription to prevent duplicate charges.
    if (billing.subscription.status === "active" && billing.subscription.plan === body.plan) {
      return NextResponse.json({ error: "You are already subscribed to this plan." }, { status: 409 });
    }

    // Reuse existing Stripe customer if one exists, otherwise create a new one.
    let customerId = billing.subscription.providerCustomerId ?? undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: billing.profile.billingEmail ?? user.email,
        name: billing.profile.billingName ?? user.name,
        metadata: { userId: user.id }
      });
      customerId = customer.id;
      await setStripeIds(user.id, customerId, null);
    }

    const priceId = planPriceId(body.plan);
    const base = appUrl();

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${base}/account?section=billing&upgraded=1`,
      cancel_url: `${base}/account?section=billing`,
      metadata: { userId: user.id, plan: body.plan },
      allow_promotion_codes: true,
      subscription_data: {
        metadata: { userId: user.id, plan: body.plan }
      }
    });

    return NextResponse.json({ url: session.url });
  });
}
