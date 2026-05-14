import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getUserByStripeCustomerId, setStripeIds, setSubscriptionPlan } from "@/lib/services/billing";
import { planFromPriceId, stripeClient } from "@/lib/stripe";
import type { HostedPlan } from "@/lib/types";

export const dynamic = "force-dynamic";

// Stripe sends the raw body for signature verification — do not parse as JSON upstream.
export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    console.error("[webhook] STRIPE_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const sig = request.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = stripeClient().webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("[webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    await handleEvent(event);
  } catch (err) {
    console.error(`[webhook] Error handling ${event.type}:`, err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== "subscription") break;

      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;
      const plan = (session.metadata?.plan as HostedPlan) ?? "free";
      const userId = await resolveUserId(customerId, session.metadata?.userId);
      if (!userId) { console.warn("[webhook] checkout.session.completed: no userId for customer", customerId); break; }

      await setStripeIds(userId, customerId, subscriptionId);
      await setSubscriptionPlan(userId, plan, "active");
      console.log(`[webhook] Activated ${plan} for user ${userId}`);
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;
      const userId = await resolveUserId(customerId);
      if (!userId) { console.warn("[webhook] subscription.updated: no userId for customer", customerId); break; }

      // Determine plan from the first price item.
      const priceId = sub.items.data[0]?.price.id ?? "";
      const plan = planFromPriceId(priceId);
      const status = sub.status === "active" || sub.status === "trialing" ? "active" : "inactive";
      await setSubscriptionPlan(userId, plan, status);
      await setStripeIds(userId, customerId, sub.id);
      console.log(`[webhook] Updated subscription to ${plan} (${status}) for user ${userId}`);
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;
      const userId = await resolveUserId(customerId);
      if (!userId) { console.warn("[webhook] subscription.deleted: no userId for customer", customerId); break; }

      await setSubscriptionPlan(userId, "free", "free");
      console.log(`[webhook] Downgraded user ${userId} to free (subscription canceled)`);
      break;
    }

    default:
      // Ignore unhandled events.
      break;
  }
}

async function resolveUserId(customerId: string, metadataUserId?: string): Promise<string | null> {
  // Prefer DB lookup by customer ID — metadata can be missing on manual events.
  const fromDb = await getUserByStripeCustomerId(customerId);
  return fromDb ?? metadataUserId ?? null;
}
