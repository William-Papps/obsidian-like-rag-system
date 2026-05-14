import Stripe from "stripe";
import type { HostedPlan } from "@/lib/types";

let _client: Stripe | null = null;

export function stripeClient(): Stripe {
  if (_client) return _client;
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  _client = new Stripe(key, { apiVersion: "2026-04-22.dahlia" });
  return _client;
}

export function planPriceId(plan: "starter" | "pro"): string {
  const id = plan === "starter"
    ? process.env.STRIPE_STARTER_PRICE_ID?.trim()
    : process.env.STRIPE_PRO_PRICE_ID?.trim();
  if (!id) throw new Error(`STRIPE_${plan.toUpperCase()}_PRICE_ID is not set`);
  return id;
}

export function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
}

export function planFromPriceId(priceId: string): HostedPlan {
  if (priceId === process.env.STRIPE_STARTER_PRICE_ID?.trim()) return "starter";
  if (priceId === process.env.STRIPE_PRO_PRICE_ID?.trim()) return "pro";
  return "free";
}
