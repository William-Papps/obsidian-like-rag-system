import { dbGet } from "@/lib/db";
import { createNote } from "@/lib/services/notes";
import { addNoteTag, createTag, type Tag } from "@/lib/services/tags";
import { reindexNotes } from "@/lib/rag/indexing";
import { toCamelRecord } from "@/lib/utils";
import type { Note } from "@/lib/types";

const SAMPLE_TAG_COLOR = "#6B7280";

const DEMO_NOTES: Array<{ title: string; markdownContent: string }> = [
  {
    title: "Incident Response Runbook",
    markdownContent: `# Incident Response Runbook

## Severity Levels

| Level | Definition | Response Time | Example |
|---|---|---|---|
| P0 | Full service outage, all users affected | 15 minutes | API returning 500 for all requests |
| P1 | Partial outage, >25% of users affected | 30 minutes | Payments failing, search down |
| P2 | Degraded performance, data integrity risk | 2 hours | Response times >5s, queued jobs backing up |
| P3 | Minor bug, no data risk, workaround exists | Next business day | UI glitch, non-critical feature broken |

## On-Call Rotation

Primary on-call: rotate weekly, Monday 9 AM handoff. Current rotation: Alex Chen → Maria Santos → Dev Okafor → James Liu.

Escalation path:
1. Primary on-call engineer
2. Engineering lead (Maria Santos, +1-415-555-0182)
3. VP Engineering (Dev Okafor) if P0 is unresolved after 45 minutes

## Response Steps

### P0 / P1 Response

1. Acknowledge the alert in PagerDuty within the SLA window.
2. Post in #incidents Slack channel: "Investigating [brief description] — ETA for update: 15 min."
3. Open a war room in the #inc-[date] Slack channel.
4. Diagnose: check Datadog dashboard → recent deploys → database connections → third-party status pages.
5. If a deploy is the cause: roll back immediately using \`./scripts/rollback.sh <previous-tag>\` before further investigation.
6. Post status update every 15 minutes until resolved.
7. After resolution: update Statuspage, send customer email if >30 min impact.

### Post-Incident

Complete a post-mortem within 72 hours of resolution. Template in Notion under Engineering > Post-Mortems. Required sections: timeline, root cause, impact, remediation steps, action items with owners and due dates.

## Key Contacts

- Database (RDS): AWS console, contact @db-team in Slack
- CDN (Cloudflare): dashboard.cloudflare.com, credentials in 1Password under "Cloudflare Prod"
- Payment processor (Stripe): dashboard.stripe.com, contact stripe-support@meridian.io
`,
  },
  {
    title: "Code Review Standards",
    markdownContent: `# Code Review Standards

## Requirements

Every pull request requires at least **two approvals** before merging to main. One approval must come from a senior engineer (L4+) if the change touches authentication, billing, or database migrations.

PRs must not sit unreviewed for more than **48 hours** on business days. If a PR is blocked for more than 48 hours, the author should ping the #eng-reviews Slack channel.

## Size Guidelines

- **Small PR (< 200 lines):** target 24-hour review turnaround
- **Medium PR (200–500 lines):** target 48-hour turnaround; consider splitting if possible
- **Large PR (> 500 lines):** must include a written design doc linked in the PR description before review begins

## Checklist Before Requesting Review

- [ ] Tests pass locally (\`npm test\`)
- [ ] Type-check passes (\`npm run typecheck\`)
- [ ] No console.log or debug artifacts left
- [ ] Migration script included if schema changed
- [ ] CHANGELOG entry added for user-visible changes
- [ ] PR description explains the *why*, not just the what

## Review Etiquette

Use conventional comment prefixes:
- \`nit:\` — minor style issue, non-blocking
- \`suggestion:\` — take it or leave it, explain trade-offs
- \`blocker:\` — must be addressed before merge
- \`question:\` — asking for context, not requesting change

Reviewers should not re-review the same files more than twice. If a thread is going in circles, move it to a synchronous call.

## Merging

We use squash-and-merge for feature branches. Merge commits are only used when merging release branches back to main. Delete the branch after merge.
`,
  },
  {
    title: "Engineering Onboarding — First 30 Days",
    markdownContent: `# Engineering Onboarding — First 30 Days

## Before Day 1 (IT sends)

- MacBook Pro 14" M3 (16 GB RAM, 512 GB SSD) — standard for all engineers
- 1Password team invite
- GitHub org invite
- AWS IAM account (read-only prod, read/write staging)
- Datadog guest access

## Week 1: Access and Context

**Day 1**
- Meet your onboarding buddy (assigned by EM before start date)
- Complete security training in BambooHR (mandatory, 2 hours)
- Set up local dev environment using \`./scripts/setup.sh\` — takes approximately 20 minutes on a clean Mac
- Read the Architecture Overview doc in Notion

**Days 2–5**
- Shadow two code reviews (read-only)
- Read the last three post-mortems
- Complete your first "good first issue" ticket — assigned by EM before start date, estimated 1–3 days

## Week 2–4: First Contribution

- Submit your first PR by end of week 2
- Attend sprint planning and retrospective
- Pair with a senior engineer for at least one debugging session
- Review and understand the deployment checklist before your first deploy

## 30-Day Check-In

At 30 days, your EM will schedule a check-in covering: comfort with the codebase, blockers, feedback on onboarding. This is not a performance review.

## Key Resources

- Architecture diagram: Notion → Engineering → System Design
- Runbooks: this knowledge base, tag "Operations"
- Credentials: 1Password team vault
- On-call schedule: PagerDuty (you are not on-call until day 90)
`,
  },
  {
    title: "Deployment Checklist",
    markdownContent: `# Deployment Checklist

Use this checklist for every production deployment. Skip no steps. If a step fails, stop and resolve before continuing.

## Pre-Deploy

- [ ] All CI checks passing on the branch (GitHub Actions)
- [ ] PR approved by 2 engineers, including one L4+ for auth/billing/DB changes
- [ ] Database migrations reviewed: confirm they are backwards-compatible (old code can run against new schema)
- [ ] Feature flags set correctly for gradual rollout if applicable
- [ ] Notify #deploys Slack channel: "[Name] deploying [service] [version] — ETA complete: [time]"
- [ ] Check Datadog for any ongoing incidents or elevated error rates before starting

## Deploy

- [ ] Run \`./scripts/deploy.sh production\` — do not deploy manually
- [ ] Monitor Datadog dashboard during deploy (p50/p99 latency, error rate)
- [ ] Confirm health checks pass: all instances healthy in ECS console within 3 minutes

## Post-Deploy

- [ ] Run smoke tests: \`npm run smoke-test:prod\`
- [ ] Verify core user flows manually: sign up, create note, index, query
- [ ] Check error rate in Datadog — should return to baseline within 5 minutes
- [ ] Update #deploys: "Deploy complete — all checks green" or rollback status

## Rollback Procedure

If error rate rises above 1% after deploy or any smoke test fails:

1. Run \`./scripts/rollback.sh\` immediately — do not wait for root cause
2. Post in #incidents: "Rolling back [service] due to [brief reason]"
3. Investigate root cause in staging before attempting re-deploy

Rollback completes in approximately 4 minutes.
`,
  },
  {
    title: "Q3 2024 Planning — Meeting Notes",
    markdownContent: `# Q3 2024 Planning Meeting Notes

**Date:** June 28, 2024
**Attendees:** Dev Okafor (VP Eng), Maria Santos (EM), Alex Chen, Priya Nair, James Liu, Fatima Al-Rashid
**Facilitator:** Maria Santos

## Goals Set for Q3

1. **Ship document import (PDF, DOCX)** — Owner: Alex Chen. Target: August 15.
2. **Reduce p99 query latency below 800ms** — Owner: Priya Nair. Current baseline: 1,400ms.
3. **Launch team workspace feature** — Owner: James Liu. Target: September 1.
4. **Complete SOC 2 Type I prep** — Owner: Fatima Al-Rashid. External auditor engaged: Prescient Security. Target report: September 30.

## Decisions Made

- **Mobile app:** Deferred to Q1 2025. Reason: insufficient bandwidth; team is already at capacity with Q3 goals. Revisit in October planning.
- **Pricing change:** Do not change pricing this quarter. Current Free/Starter/Pro tiers remain unchanged. Pricing review scheduled for Q4.
- **On-call rotation:** Move from bi-weekly to weekly rotation starting July 8 to reduce burnout. Dev will cover the first week.

## Risks Flagged

- SOC 2 timeline is tight if infrastructure access reviews take longer than 2 weeks. Fatima to escalate to Dev by July 15 if blocked.
- Team workspace feature depends on notification system not yet designed. James to complete design doc by July 5.

## Next Meeting

Sprint planning: July 1, 10 AM PT.
`,
  },
  {
    title: "Product Roadmap — H2 2024",
    markdownContent: `# Product Roadmap — H2 2024

Last updated: July 3, 2024. Owner: Priya Nair (PM).

## Q3 (July–September 2024)

| Feature | Status | Owner | Target Date | Notes |
|---|---|---|---|---|
| Document import (PDF, DOCX) | In progress | Alex Chen | Aug 15 | OCR for embedded images in scope |
| Team workspaces | In design | James Liu | Sep 1 | Invite-based, editor/owner roles |
| Query latency reduction | In progress | Priya Nair | Sep 30 | Target: p99 < 800ms |
| SOC 2 Type I prep | In progress | Fatima | Sep 30 | External auditor: Prescient Security |

## Q4 (October–December 2024)

| Feature | Status | Owner | Target Date | Notes |
|---|---|---|---|---|
| Slack integration | Planned | TBD | Nov 15 | Index Slack channels as notes |
| Pricing revision | Planned | Priya Nair | Oct 15 | Add annual billing option |
| Mobile app (iOS) | Planned | TBD | Dec 31 | Deferred from Q3 |
| Audit log export | Planned | Fatima | Oct 31 | Required for enterprise pilots |

## Deferred / Parked

- **API access for third-party integrations:** Deferred to H1 2025. Requires auth scoping work not yet designed.
- **Self-hosted enterprise tier:** Parked pending reference customers. Revisit after first enterprise deal closes.

## How to Submit Requests

Add to the backlog in Linear under project "Product Requests." Include: user impact estimate, effort estimate, supporting customer evidence. PM reviews backlog weekly on Tuesdays.
`,
  },
  {
    title: "API Rate Limits and Authentication",
    markdownContent: `# API Rate Limits and Authentication

## Authentication

All API requests require a Bearer token in the \`Authorization\` header:

\`\`\`
Authorization: Bearer <your-api-key>
\`\`\`

API keys are generated in Account → API Keys. Each key is scoped to a single workspace. Keys do not expire but can be revoked at any time.

## Rate Limits

Rate limits apply per API key per minute.

| Plan | Requests/minute | Notes |
|---|---|---|
| Free | 60 | Applies to all endpoints |
| Starter | 300 | Applies to all endpoints |
| Pro | 1,000 | Applies to all endpoints |
| Enterprise | Custom | Contact sales |

Search and query endpoints are additionally limited by AI quota (see Quota docs). Rate limits and AI quota are independent — a request can be rate-limited before it consumes AI quota.

## Error Codes

| Code | Meaning | Action |
|---|---|---|
| 401 | Invalid or expired token | Re-authenticate, check key revocation |
| 429 | Rate limit exceeded | Retry after the \`Retry-After\` header value (seconds) |
| 422 | Request validation error | Check request body against API schema |
| 503 | Service temporarily unavailable | Retry with exponential backoff, max 3 retries |

## Pagination

All list endpoints return a maximum of 100 items per page. Use \`?cursor=<next_cursor>\` from the response envelope to fetch subsequent pages. An empty \`next_cursor\` means you have reached the last page.

## Webhooks

Webhook delivery is retried up to **5 times** with exponential backoff if your endpoint returns a non-2xx response. After 5 failures the webhook event is dropped and logged. Configure your endpoint to respond within **10 seconds** or the request will time out and be retried.
`,
  },
  {
    title: "Remote Work Policy",
    markdownContent: `# Remote Work Policy

Effective: January 1, 2024. Owner: People Operations.

## Eligibility

All full-time employees are eligible to work remotely. Contractors work under terms specified in their contract; this policy does not apply to contractors.

## Core Hours

Core hours are **10 AM – 3 PM Pacific Time**, Monday through Friday. All employees, regardless of timezone, are expected to be available for synchronous communication during core hours. Employees outside Pacific Time should adjust their schedule accordingly.

## Home Office Stipend

Meridian provides a one-time home office setup stipend of **$1,500** for new employees, payable after 30 days of employment. Eligible expenses: desk, chair, monitor, keyboard, mouse, webcam, headset. Submit receipts via BambooHR within 90 days of purchase. Receipts submitted after 90 days will not be reimbursed.

Ongoing internet stipend: **$75/month**, paid as a monthly addition to payroll. No receipt required.

## Co-Working

Employees who prefer to work from a co-working space may expense up to **$300/month** in co-working fees. Submit monthly receipts via BambooHR.

## Travel

Meridian hosts an all-hands in San Francisco twice per year (January and July). Attendance is expected for all full-time employees. Travel and accommodation are fully covered. Additional team offsites may be organized by individual teams; costs require VP approval in advance.

## Equipment

Meridian-issued laptops must be returned within 10 business days of employment termination. Personal devices may not be used to access production systems.
`,
  },
  {
    title: "PTO and Leave Policy",
    markdownContent: `# PTO and Leave Policy

Effective: January 1, 2024. Owner: People Operations.

## PTO Accrual

Meridian provides **unlimited PTO** for all full-time employees. There is no accrual, no cap, and no payout upon termination. The expectation is a minimum of **15 days per year** — managers will prompt employees who have taken fewer than 10 days by mid-year.

## Approval Process

- **1–3 days:** Notify your manager at least 5 business days in advance via the PTO request in BambooHR.
- **4–9 days:** Request at least 2 weeks in advance. Manager approval required within 3 business days of request.
- **10+ days:** Request at least 4 weeks in advance. Manager and VP approval required.

Requests are not automatically approved. Your manager considers team capacity, sprint commitments, and coverage.

## Public Holidays

Meridian observes **11 US federal holidays** plus 2 floating holidays per year. Floating holidays can be used for religious observances, cultural holidays, or any personal reason. They do not roll over to the next calendar year.

## Sick Leave

Sick leave is separate from PTO and does not require advance notice. Notify your manager as early as possible on the day of absence. There is no limit on sick days; extended illness (>5 consecutive days) requires documentation for payroll purposes.

## Parental Leave

Primary caregiver: **16 weeks** fully paid, available from birth/adoption/placement.
Secondary caregiver: **6 weeks** fully paid.
Leave must begin within 12 months of the qualifying event. Contact People Operations at least 8 weeks before the expected start date.
`,
  },
  {
    title: "Competitive Analysis — Q3 2024",
    markdownContent: `# Competitive Analysis — Q3 2024

Last updated: July 12, 2024. Owner: Priya Nair.

## Summary

Meridian's closest competitors in the AI-assisted knowledge management space are Notion AI, Guru, and Tettra. None offer grounded, citation-based answers from private documents without relying on cloud AI trained on user data.

## Competitor Overview

### Notion AI
- **Strength:** Dominant brand, best-in-class editor, massive user base
- **Weakness:** AI answers are not grounded — Notion AI can hallucinate facts not in your notes. No citation system.
- **Pricing:** +$10/user/month on top of Notion plan
- **Our differentiation:** Meridian answers are always grounded in indexed content with source citations. Users who need accuracy over convenience choose Meridian.

### Guru
- **Strength:** Enterprise focus, strong Slack/Teams integration, verification workflow
- **Weakness:** No AI Q&A; search is keyword-based. High price ($15/user/month on Business).
- **Our differentiation:** AI-powered querying vs. keyword search. Guru is a wiki; Meridian is a queryable knowledge base.

### Tettra
- **Strength:** Simple, affordable ($4/user/month), good for small teams
- **Weakness:** No AI features. Basic editor and search.
- **Our differentiation:** AI Q&A with citations. Tettra is a traditional internal wiki.

## Key Differentiator to Emphasize

Grounded answers with citations is our defensible moat. No competitor today gives users a cited excerpt alongside the answer. This is the primary reason users choose Meridian over Notion AI.

## Gaps to Watch

Notion is investing heavily in AI. Monitor their release notes. If they add citation-based retrieval in the next 2 quarters, the differentiation narrows significantly.
`,
  },
  {
    title: "Customer Interview Synthesis — August 2024",
    markdownContent: `# Customer Interview Synthesis — August 2024

**Interviews conducted:** 8 customers (4 Starter, 3 Pro, 1 Free)
**Conducted by:** Priya Nair and Maria Santos
**Date range:** August 5–16, 2024

## Top 3 Pain Points Reported

### 1. Onboarding is too slow (6 of 8 customers)
Users consistently said the time between signing up and getting their first useful answer was too long. The most common blocker: importing existing documents. Three customers had notes in Notion, one in Confluence, and they had to manually export and re-import. Quote from a Starter user: "I spent 2 hours getting my notes in before I could actually try the product. By then I'd lost the excitement."

### 2. Index state is confusing (5 of 8 customers)
Users did not understand when their notes were indexed, when they needed to reindex, or what "stale" meant. Two users had been using the product for weeks with unindexed notes, thinking their queries were returning results from all their content.

### 3. Answer confidence is opaque (4 of 8 customers)
When the AI returns a "not found" answer, users don't know if that means "this information doesn't exist in your notes" or "I couldn't find it but it might be there." One Pro user: "I asked about our refund policy and it said not found. I knew the policy was in there. I didn't trust the tool after that."

## What Customers Love

- Citation system: "Knowing exactly which note the answer came from is huge. I can verify it."
- Speed: "Faster than I expected for a search that actually understands my question."
- Privacy: "I can put sensitive client data in here and not worry about it going to OpenAI training data."

## Recommended Actions

1. Add a "Quick import from Notion/Confluence" flow to reduce onboarding friction.
2. Replace "stale" badge with plain-English: "New content — click to update search index."
3. When "not found," show the top 2 closest matches with a note: "These were the closest results — the exact information may not be in your knowledge base."
`,
  },
  {
    title: "Sprint 42 Retrospective",
    markdownContent: `# Sprint 42 Retrospective

**Date:** July 26, 2024
**Facilitator:** Maria Santos
**Team:** Alex Chen, Priya Nair, James Liu, Fatima Al-Rashid, Dev Okafor (observer)

## What Went Well

- Document import shipped on time (Alex). Zero regressions in production.
- New query latency optimization reduced p99 from 1,400ms to 980ms (Priya). On track for Q3 goal of <800ms.
- On-call handoff process improved significantly with new runbook template. No escalations this sprint.

## What Didn't Go Well

- Workspace feature design doc was 5 days late (James). Caused sprint planning to proceed without final scope, leading to two tasks being replanned mid-sprint. **Action: design docs due 3 business days before sprint planning.**
- Two bug reports from customers related to the document import (PDF page numbering off). Both fixed same day, but should have been caught in QA. **Action: add PDF page numbering to smoke test suite.**

## Action Items

| Action | Owner | Due |
|---|---|---|
| Add "design doc deadline" rule to sprint planning template | Maria | Aug 2 |
| Add PDF page numbering to smoke tests | Alex | Aug 5 |
| Schedule 30-min Q3 goal check-in (latency progress) | Priya | Aug 9 |

## Team Health

Team reported 3.8/5 energy level (down from 4.2 last sprint). Primary reason: unclear Q3 scope during the first week. Resolved after design doc landed.
`,
  },
  {
    title: "Database Migration SOP",
    markdownContent: `# Database Migration SOP

All schema changes require a migration script. This SOP applies to all production database changes regardless of size.

## Principles

1. **All migrations must be backwards-compatible.** Old application code must run correctly against the new schema. This means: no dropping columns without a deprecation period, no adding NOT NULL columns without a default, no renaming columns (add new, copy data, drop old in separate migrations).
2. **Never run migrations manually.** All migrations run through the automated migration system on deploy. If you are considering a manual migration, stop and discuss with the EM first.
3. **Test in staging first.** Every migration must run successfully in the staging environment before it deploys to production. CI enforces this.

## Migration File Naming

\`YYYYMMDD_HHMMSS_description_of_change.sql\`

Example: \`20240801_143022_add_user_timezone_column.sql\`

## Pre-Migration Checklist

- [ ] Migration is backwards-compatible (old code works with new schema)
- [ ] Migration tested in local dev environment
- [ ] Migration reviewed by one other engineer
- [ ] Large table migrations (>1M rows): consult with Priya Nair before writing the migration — may require a blue/green strategy

## Rollback

Most migrations cannot be automatically rolled back. If a migration causes a production incident:

1. Rollback the application code first (4 minutes via \`./scripts/rollback.sh\`)
2. Assess whether the schema change caused the issue
3. If yes: write a compensating migration to revert the schema change, deploy it separately

**Never attempt to manually reverse a migration in production under incident conditions.** Application rollback is always the first step.

## Row-Level Lock Warning

\`ALTER TABLE\` statements on tables >500,000 rows can lock the table for seconds to minutes. Use \`pt-online-schema-change\` for large table migrations. Contact Priya Nair for setup.
`,
  },
  {
    title: "Security Incident Response Policy",
    markdownContent: `# Security Incident Response Policy

Effective: March 1, 2024. Owner: Fatima Al-Rashid (Security).

## Scope

This policy covers: suspected data breaches, unauthorized system access, credential compromise, and ransomware/malware incidents. It applies to all Meridian systems, including production, staging, and employee devices.

## Immediate Response (First 30 Minutes)

If you suspect a security incident:

1. **Do not attempt to remediate on your own.** Notify the security lead immediately.
2. **Preserve evidence.** Do not delete logs, terminate processes, or reboot systems without security lead approval.
3. Contact Fatima Al-Rashid directly: Slack @fatima, phone +1-415-555-0194 (24/7 for P0 security events).
4. Open a private incident channel: #sec-inc-[date].

## Classification

| Type | Definition | Notification Required |
|---|---|---|
| Confirmed breach | Customer data accessed by unauthorized party | Legal, affected customers, regulators within 72 hours (GDPR) |
| Suspected breach | Evidence of unauthorized access, scope unclear | Legal and executive team within 2 hours |
| Credential compromise | Internal credentials leaked (API keys, passwords) | Security lead, affected system owners within 1 hour |
| Service disruption | Attack causing outage (DDoS, etc.) | Use incident response runbook; no external notification unless >4 hours |

## Legal and Regulatory Obligations

Under GDPR, confirmed breaches affecting EU residents must be reported to the relevant supervisory authority within **72 hours** of discovery. Under CCPA, California residents must be notified within **45 days**. Fatima coordinates all regulatory notifications with outside counsel (Greenberg Traurig).

## Post-Incident

Complete a security post-mortem within 5 business days. Share with the executive team. Update affected runbooks within 10 business days.
`,
  },
  {
    title: "Engineering Manager Sync — July 2024",
    markdownContent: `# Engineering Manager Sync — July 2024

**Date:** July 9, 2024
**Attendees:** Maria Santos (EM), Dev Okafor (VP Eng)
**Cadence:** Monthly 1:1

## Team Capacity

Current headcount: 5 engineers (Alex, Priya, James, Fatima, + new hire Kenji starting August 5).

Kenji is joining as a mid-level backend engineer. He will be on onboarding ramp for the first 30 days (no sprint commitments until September 1). Maria will be his onboarding buddy.

One engineer (James) is taking 2 weeks of PTO in late August (Aug 19–30). Sprint 44 should be planned with 4-engineer capacity.

## Blockers and Risks

- **Workspace feature:** Design doc is late (see retro notes). James needs unblocked time this week. Maria will shield him from cross-team requests until the doc is done.
- **Latency goal:** Priya is making progress (1,400ms → 980ms p99) but the remaining 180ms may require infrastructure changes (moving to a read replica for query requests). Dev to approve infrastructure cost before Priya invests more than 3 days. **Decision: approved. Max additional cost $800/month.**
- **SOC 2:** Fatima flagged that the vendor access review is taking longer than expected. Pushing the SOC 2 Type I report target from September 30 to October 15. Dev accepted the date change.

## Decisions

- Latency reduction: approved read-replica for query path (≤$800/month additional cost). Owner: Priya.
- SOC 2 timeline: extended to October 15. Fatima to communicate to auditor.
- Kenji onboarding: no sprint commitments before September 1. Maria is responsible for onboarding plan.

## Next Sync

August 13, 2024.
`,
  },
];

async function getOrCreateSampleTag(userId: string): Promise<Tag> {
  const row = await dbGet<Record<string, unknown>>(
    "select * from tags where user_id = ? and lower(name) = 'sample'",
    [userId]
  );
  if (row) return toCamelRecord(row) as Tag;
  return createTag(userId, "Sample", SAMPLE_TAG_COLOR);
}

export async function seedDemoNotes(userId: string): Promise<Note[]> {
  const sampleTag = await getOrCreateSampleTag(userId);

  const notes: Note[] = [];
  for (const noteData of DEMO_NOTES) {
    const note = await createNote(userId, noteData);
    await addNoteTag(note.id, sampleTag.id);
    notes.push(note);
  }

  // Index all demo notes in the background — do not block the bootstrap response.
  // On the hosted site (OpenAI embeddings) this completes in ~15–30 seconds.
  reindexNotes(userId).catch(console.error);

  return notes;
}
