# Acerola — Sponsor Due-Diligence Checklist

Use this checklist before asking for or accepting sponsorship. Mark an item complete only when its evidence exists and has been reviewed.

## Product and technology
- [ ] Live product walkthrough completed on mobile and desktop.
- [ ] Playwright desktop/mobile smoke tests pass in GitHub Actions.
- [ ] Feature inventory separates live, beta, experimental and planned functionality.
- [ ] Text chat tested repeatedly with dated results.
- [ ] Monthly request entitlements verified with a designated test account and no production quota exhaustion.
- [ ] Background jobs verified: immediate dispatch, one-minute recovery schedule, and bounded retry behaviour.
- [ ] OpenAI primary route and Gemini fallback tested under controlled failure conditions.
- [ ] Authentication, logout and account isolation tested.
- [ ] Memory read/write and account separation tested.
- [ ] Attachment type, size and count limits tested.
- [ ] Image and spoken-audio generation tested if included in the demo.
- [ ] Clear error states and recovery paths reviewed.
- [ ] Known limitations and outages documented.

## Security and privacy
- [ ] Data-flow diagram reviewed.
- [ ] Supabase row-level security and Edge Function authorization independently checked.
- [ ] Ordinary users cannot assign or change their own profile role.
- [ ] Provider keys and service-role secrets confirmed absent from client bundles and Git history.
- [ ] Rate limits, abuse controls and cost ceilings reviewed.
- [ ] Data retention, deletion and backup practices documented.
- [ ] Privacy notice and terms reviewed for accuracy.
- [ ] Incident response and secret-rotation procedure documented.
- [ ] Independent security review scoped; findings tracked to closure.
- [ ] Supabase leaked-password protection enabled and verified.
- [ ] Guest-session RLS warnings reviewed against intended guest features.
- [ ] pg_net extension placement reviewed without breaking the queue dispatcher.

## Business and traction
- [ ] Legal owner and account ownership documented.
- [ ] Responsible adult/guardian involved in financial and contractual arrangements where required.
- [ ] Actual active-user metric defined and supported by analytics.
- [ ] Retention and feedback measured over a stated period.
- [ ] Paystack checkout, webhook, verification, cancellation and renewal paths tested end to end.
- [ ] Actual payment and revenue records reconciled; test transactions excluded.
- [ ] Pricing and refund/support policies documented.
- [ ] Monthly API, hosting and operating costs measured.
- [ ] Competitor comparison uses current, sourced information.

## Sponsorship proposal
- [ ] Sponsor's objectives and expected outcomes understood.
- [ ] Exact amount or in-kind support requested is based on a costed budget.
- [ ] Milestones, dates, owners and acceptance criteria agreed.
- [ ] Spending cap and reporting cadence agreed.
- [ ] IP ownership, branding, publicity and termination terms reviewed.
- [ ] No sponsor receives user conversation data or production credentials.
- [ ] Written agreement reviewed by an appropriate adult and qualified adviser where necessary.

## Evidence folder structure
Keep dated, redacted evidence in a private folder. Never commit secrets or user data to the public repository.

- 01-product-demo/
- 02-test-reports/
- 03-security-review/
- 04-usage-metrics/
- 05-payment-reconciliation/
- 06-costs-and-budget/
- 07-sponsor-agreement/

## Current evidence gaps
As of 13 November 2026, the public repository establishes that substantial implementation exists. It does not establish verified active-user counts, retention, revenue, independent security certification, or complete live acceptance testing of all integrated features. Obtain this evidence before making those claims to a sponsor.
