# Payment Webhooks Fix Plan

## Changes

- `app/api/billing/webhook/route.ts` — add idempotency check using `app_settings` table keyed by `stripe_event:{id}`; change handler error response from 500 to 200 with error logging

## Verification goals

- [ ] Processing the same event ID twice only calls `handleEvent` once
- [ ] Handler failure returns 200 (not 500)
- [ ] Signature failure still returns 400
- [ ] First processing of a new event returns 200

## Manual verification (for the human)

- In Stripe Dashboard → Webhooks → resend a past event → confirm it returns 200 and is NOT re-processed (check DB or logs)
