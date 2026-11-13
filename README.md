# Acerola — Your Personal Intelligence System

**Acerola** is a personal AI assistant built around a browser client, an authenticated server gateway, an Agent Core orchestration layer, multimodal input, persistent memory, and modular workspaces.

**Live web app:** https://acerolaorionjr.github.io/acerola-ai/  
**Sponsorship overview:** https://acerolaorionjr.github.io/acerola-ai/sponsorship.html  
**Source code:** https://github.com/acerolaorionjr/acerola-ai

## Current stack

- Client: responsive HTML/CSS/JavaScript web app
- Acerola Engine: v0.8.0
- Agent Core: v1.4.0
- AI gateway: authenticated Supabase Edge Function with bounded per-model timeouts, OpenAI-first routing, Gemini failover, and server-enforced monthly usage entitlements
- Background replies: encrypted job access tokens, immediate asynchronous worker dispatch, a one-minute recovery poll, and bounded retry handling
- Authentication: Supabase Auth
- Persistent memory: authenticated Supabase-backed memory with local fallback
- Multimodal input: up to 5 attachments per request
- Media generation: image generation and spoken-audio generation through deployed Edge Functions; video generation is not currently implemented and is not advertised as an available feature

## Runtime flow

~~~text
User
  |
  v
Acerola Command Center UI
  |
  +-- Chat / workspaces
  +-- Voice input
  +-- Multimodal file tray (0-5)
  |
  v
Agent Core v1.4.0
  |
  +-- Conversation manager
  +-- Memory manager
  +-- Tool router
  +-- Action/task engine
  |
  v
Authenticated Supabase gateway
  |
  v
OpenAI Responses API / configured model
~~~

Provider credentials and Supabase service-role secrets remain server-side.

## Workspaces

| Workspace | Purpose |
|---|---|
| Research | Web-oriented research, evidence comparison and sourced answers |
| Create | Writing, planning and multimodal creation |
| Code | Software building, debugging and project work |
| Analyze | Documents, images, data and structured reasoning |
| Tasks | Agent task execution and progress |
| Memory | Persistent context and memory inspection |

Desktop uses a persistent command-center sidebar; smaller screens use the mobile navigation and drawer.

## Multimodal pipeline

The client enforces a maximum of 5 attachments per request and rejects individual files larger than 8 MB. Images are resized client-side before submission. Other supported files are encoded for authenticated backend processing.

The interface provides a live 0 / 5 file counter, attachment previews/chips, removal controls, and drag-and-drop input on supported browsers.

## Security

- The AI gateway requires an authenticated Supabase session.
- Provider API keys and service-role credentials are not committed to the repository.
- Tool execution is allowlisted by Agent Core.
- Arbitrary browser-side code execution is not exposed as an agent tool.
- Memory operations are scoped to the authenticated user on the backend.
- Meaningful external side effects should require authorization and human oversight.

## Testing

The Python/pytest contract suite in tests/ checks key product and backend contracts. Playwright tests load the home and sponsorship pages at desktop and mobile viewport sizes. These automated checks do not replace authenticated end-to-end tests of provider responses, account isolation, payment events or real media generation.

## Sponsorship and project readiness

- [Sponsor readiness status](docs/SPONSOR_READINESS_STATUS.md)
- [Sponsor cost worksheet](docs/SPONSOR_COST_WORKSHEET.md)
- [Final manual acceptance checklist](docs/FINAL_ACCEPTANCE_CHECKLIST.md)

Acerola is an early-stage project and does not claim verified active-user counts, retention, revenue, product-market fit or independent security certification. Payment, subscription and integrated feature paths require live end-to-end acceptance evidence before being presented as fully verified.

- [Sponsorship overview](SPONSORSHIP.md)
- [Sponsor demonstration script](docs/SPONSOR_DEMO_SCRIPT.md)
- [Sponsor due-diligence checklist](docs/SPONSOR_DUE_DILIGENCE.md)
- [Proposed sponsorship milestones](docs/SPONSOR_MILESTONES.md)

Any financial, contractual, payment-account, equity or ownership arrangement must involve an appropriate parent/guardian or responsible adult representative. Sponsors should not receive access to private user conversations or production secrets.

## GitHub Pages

.github/workflows/deploy-pages.yml validates JavaScript syntax, production gateway CORS, pytest/Playwright smoke tests and required files before deployment, then checks the live home and sponsorship routes.

## Project direction

Acerola should grow through explicit, authenticated and allowlisted capabilities. New external-account actions and other meaningful side effects should require appropriate authorization and confirmation.
