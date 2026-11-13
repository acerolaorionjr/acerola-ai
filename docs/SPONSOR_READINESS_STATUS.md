# Acerola — Sponsor Readiness Status

**Review date:** 13 November 2026  
**Repository:** https://github.com/acerolaorionjr/acerola-ai  
**Product:** https://acerolaorionjr.github.io/acerola-ai/

## Executive status

**Status: sponsor-introduction ready; formal funding request still pending evidence.**

The sponsorship overview, public sponsorship page, demo script, due-diligence checklist, milestone plan, cost worksheet, pitch deck and this readiness report are prepared. The live Supabase project reports `ACTIVE_HEALTHY`. The backend has received reliability and cost-control improvements, but a real authenticated user journey and the public Pages deployment still need independent confirmation.

Do not present implementation or a successful infrastructure health check as proof that every product feature has passed production acceptance.

## Changes completed in this review

| Change | Evidence | Status |
|---|---|---|
| Monthly AI entitlements | Authenticated gateway now calls the service-role-only monthly usage RPC before provider requests; returns clear limit and usage metadata | Deployed; real user-limit journey not yet exercised |
| Gemini fallback request | Removed a sampling parameter that current Gemini 3.8 guidance says to omit | Deployed |
| Background chat dispatch | New jobs trigger an asynchronous worker wake-up; one-minute cron remains as a recovery path | Database migration applied |
| Queue retry handling | Permanent 4xx client errors are marked terminal instead of being retried repeatedly; transient server failures retain bounded retries | Deployed |
| Queue polling cost | Backup cron changed from a 10-second schedule to one minute | Verified at 18:08, 18:09 and 18:10 UTC |
| Queue worker | Manual wake-up test returned HTTP 200 with an empty queue | Worker endpoint responds; no real user job processed in this test |
| Database access | All listed public application tables have RLS enabled; sensitive RPC execution is restricted to service role | Verified |
| Automated tests | Added pytest contract tests and Playwright desktop/mobile page smoke tests | Committed; latest Actions result not yet retrieved |

Before the cron change, the worker poller ran 8,613 times in the preceding 24 hours, with no failed cron runs. The new one-minute schedule is expected to reduce idle scheduled polls from roughly 8,640/day to 1,440/day (about 83% fewer), while immediate dispatch handles new jobs. A full-day post-change measurement is still needed.

## Evidence register

| Area | Current evidence | Status |
|---|---|---|
| Supabase project | Project status reports `ACTIVE_HEALTHY` | Verified at review time |
| Public table security | RLS enabled on all listed public application tables | Verified |
| Sensitive RPC access | Job creation/finalization functions deny anon/authenticated and allow service role | Verified |
| Profile role escalation | Server-side trigger forces normal inserts to `user` and blocks authenticated role changes; rollback-only probe confirmed the block | Verified |
| AI gateway deployment | Current function version includes monthly usage enforcement | Deployed |
| Chat worker deployment | Current function version includes terminal handling for permanent client errors | Deployed |
| Gateway/provider response | No real authenticated model response was executed in this review | Not yet verified |
| OpenAI primary / Gemini fallback | Model IDs checked against current official provider model catalogues; controlled live fallback test not run | Partially verified |
| Immediate job dispatch | Manual worker wake-up returned HTTP 200 with no queued work | Infrastructure check only |
| Real background chat | No authenticated job was submitted in this review | Not yet verified |
| Public product and sponsor pages | Browser checker could not independently fetch GitHub Pages URLs | Publication not independently verified |
| GitHub Actions | Test suite and workflow committed; latest push run status unavailable through the connected GitHub action | Not yet verified |
| Authentication and account isolation | Architecture and RLS inspected; no cross-account live test performed | Not yet verified |
| Attachments and media | Limits and backend functions documented; no real authenticated upload/generation acceptance test performed | Not yet verified |
| Paystack lifecycle | Webhook signature code is present; checkout, renewal, cancellation, refund and reconciliation were not tested | Not yet verified |
| Users and retention | No dated analytics export included | Not verified |
| Revenue | No reconciled transaction report included | Not verified |
| Operating costs | No current provider usage export or invoices included | Not yet costed |

## Supabase advisor findings

The current advisor report still contains items that require attention:

1. **Leaked-password protection is disabled.** Enable it in Supabase Authentication settings under password security. This setting could not be changed through the connected project tools.
2. **Guest-session policy warnings remain.** Some own-row policies allow anonymous sessions for guest-facing features. Review the exact tables and use cases before changing them; disabling guest access blindly could break intended functionality.
3. **The `pg_net` extension is installed in the `public` schema.** Moving it needs a dependency review because the queue dispatcher calls its `net.http_post` function. Do not move it without testing the extension schema and all dependent functions.
4. **RLS init-plan performance warnings remain.** Review the 24 flagged policies and optimize them only where the actual expression needs it.
5. **Unused-index notices remain informational.** Do not drop indexes without workload evidence.

The two tables `acerola_monthly_usage` and `acerola_push_subscriptions` have RLS enabled with no client policies. This is intentional service-role-only access, not an invitation to add broad client policies.

## Conditions before a formal funding request

1. Confirm both public Pages URLs load on a phone and desktop; save the successful GitHub Actions deployment URL and commit.
2. Complete a real authenticated chat, monthly quota, memory, attachment and background-job test using a designated test account.
3. Exercise OpenAI primary routing and a controlled Gemini fallback test without exposing provider credentials.
4. Test sign-in/out and account isolation with two controlled test accounts.
5. Test Paystack checkout, webhook verification, renewal, cancellation and refunds using approved test-mode flows; reconcile records before making revenue claims.
6. Export dated, anonymized analytics and actual provider/hosting usage. Calculate a capped pilot budget from real costs and written quotes.
7. Arrange an independent security review. Do not claim certification or penetration-test completion until one exists.
8. Have a parent/guardian or responsible adult review the sponsor contact, budget, payment-account ownership and any written terms before a financial or contractual commitment.

## Sponsor-safe language

Use: “Acerola is an early-stage product with substantial implementation in place. Its backend now enforces monthly usage entitlements and uses event-driven background dispatch with a scheduled recovery path. We are seeking support for measured reliability, security, accessibility and user validation.”

Do not claim verified traction, revenue, product-market fit, independent security certification, guaranteed uptime or full production acceptance unless dated evidence supports each claim.

## Evidence handling

Keep reports redacted. Never place API keys, service-role keys, passwords, private user conversations, personal account identifiers or unredacted payment details in the public repository or sponsor deck.
