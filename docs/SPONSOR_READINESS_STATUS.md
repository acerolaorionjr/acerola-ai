# Acerola AI — Sponsor Readiness Status

**Review date:** 13 November 2026  
**Repository:** https://github.com/acerolaorionjr/acerola-ai  
**Product:** https://acerolaorionjr.github.io/acerola-ai/

## Executive status

**Status: sponsor-introduction ready; formal funding request pending verification.**

The sponsorship page, overview, demonstration script, due-diligence checklist, milestone plan and pitch deck have been prepared and committed. The source repository contains a GitHub Pages deployment workflow that runs JavaScript syntax checks, production/local gateway CORS preflights, browser smoke tests, and required-file checks before deployment.

The existence of a workflow is not evidence that its latest run passed. During this review, the deployment and sponsorship URLs could not be independently loaded by the available browser checker, and the latest Actions run result could not be retrieved. Therefore publication, current deployment health and the browser smoke-test outcome remain **unverified** in this report.

## Evidence register

| Area | Current evidence | Status |
|---|---|---|
| Sponsor materials | Sponsorship page, overview, demo script, due-diligence checklist, milestones and pitch deck committed | Prepared |
| Deployment automation | `.github/workflows/deploy-pages.yml` inspected; workflow includes syntax, CORS, browser smoke and file checks | Workflow verified; latest run unverified |
| Public product page | Intended GitHub Pages URL recorded | Live availability not independently verified |
| Sponsor page | Intended public URL recorded | Live availability not independently verified |
| Core AI chat | Product architecture documented | Live end-to-end acceptance not evidenced |
| OpenAI primary / Gemini fallback | Routing documented in repository | Controlled failover test not evidenced |
| Authentication and account isolation | Supabase Auth architecture documented | Live isolation test not evidenced |
| Memory | Authenticated persistent-memory design documented | Cross-account isolation test not evidenced |
| Attachments and media | Limits and integrated functions documented | Full live acceptance not evidenced |
| Security | Server-side credential design documented | Independent review and secret-history audit not evidenced |
| Users and retention | No dated analytics evidence included in the sponsor pack | Not verified |
| Payments and revenue | No reconciled payment report included | Not verified |
| Operating costs | No current usage export or invoice evidence included | Not yet costed |
| Governance | Pack requires parent/guardian or responsible adult for financial and contractual matters | Must be arranged before any commitment |

## Conditions before a formal funding request

1. Confirm both public pages load on a phone and desktop, and record the successful deployment run URL and commit.
2. Run and save dated end-to-end results for chat, OpenAI routing, controlled Gemini fallback, sign-in/out, account isolation, memory, attachments and any media feature shown to the sponsor.
3. Review Supabase RLS policies, Edge Function authorization, exposed client bundles, Git history, rate limits, retention and deletion practices. Obtain an independent review before claiming security certification.
4. Export a dated, anonymized analytics summary with clearly defined active-user and returning-user metrics. If there is no meaningful usage yet, say so plainly.
5. Reconcile real Paystack transactions, refunds, renewals and cancellations. Exclude test transactions; do not state revenue without records.
6. Complete the cost worksheet using actual provider usage, invoices and quotes. Set a capped request and milestone-based spending plan.
7. Have a parent/guardian or responsible adult review the sponsor contact, budget and any written terms before money, account access, equity, IP or contractual commitments.

## Sponsor-safe language

Use: “Acerola is an early-stage product with substantial implementation in place. We are seeking support for measured reliability, security, accessibility and user validation.”

Do not claim verified traction, revenue, product-market fit, independent security certification, guaranteed uptime or full production acceptance unless dated evidence supports each claim.

## Evidence handling

Keep reports redacted. Never place API keys, service-role keys, passwords, private user conversations, personal account identifiers or unredacted payment details in the public repository or sponsor deck.
