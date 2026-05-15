# Payment Webhooks Security Report

## Status: HIGH

## Findings

### FINDING 1 — HIGH: No webhook idempotency

**File:** `app/api/billing/webhook/route.ts`

`handleEvent()` is called without checking whether `event.id` has been processed before. Stripe guarantees "at least once" delivery — it will retry webhooks that return non-200 responses, and can occasionally send duplicates even for 200 responses.

**What's at risk:** A duplicate `checkout.session.completed` event would call `setSubscriptionPlan(userId, plan, "active")` twice — which happens to be idempotent here, but the pattern is fragile. A duplicate `customer.subscription.deleted` event would re-downgrade a user who may have already re-subscribed between retries.

### FINDING 2 — MEDIUM: Handler failure returns 500, causing Stripe to retry indefinitely

```typescript
} catch (err) {
  console.error(`[webhook] Error handling ${event.type}:`, err);
  return NextResponse.json({ error: "Handler failed" }, { status: 500 });
}
```

A persistent handler error (e.g., DB constraint violation on a particular event) will cause Stripe to retry for days, spamming logs and potentially causing issues if the error is non-idempotent.

### FINDING 3 — PASS: Stripe signature verification correctly implemented

```typescript
event = stripeClient().webhooks.constructEvent(rawBody, sig, webhookSecret);
```
Stripe's SDK verifies the HMAC-SHA256 signature before any event processing. Invalid or missing signatures return 400.

### FINDING 4 — PASS: Three critical event types handled

- `checkout.session.completed` — subscription activation
- `customer.subscription.updated` — plan changes, cancellations
- `customer.subscription.deleted` — subscription cancellation → downgrade to free

`invoice.payment_failed` is not handled but this is LOW risk — subscription status is updated via `customer.subscription.updated` which fires when Stripe marks the subscription as past_due.

## What's at risk

Duplicate Stripe webhook delivery (which Stripe explicitly warns about in their docs) could double-process subscription events. Persistent handler errors cause indefinite retry loops.

## What's already secure

- Stripe signature verification on every request
- Missing signature → 400 (not processed)
- All three critical subscription lifecycle events covered

## Recommendations

1. **[HIGH — Fix]** Add idempotency: check `event.id` against stored processed events before running `handleEvent()`
2. **[MEDIUM — Fix]** On handler failure, return 200 (not 500) and log for manual review — prevents infinite retry loops
