# Acerola Intelligence System

Acerola is a personal intelligence system built around a browser client, an authenticated server gateway, an Agent Core orchestration layer, multimodal input, persistent memory, and modular workspaces.

## Current stack

- Client: responsive HTML/CSS/JavaScript web app
- Acerola Engine: v0.8.0
- Agent Core: v1.4.0
- AI gateway: Supabase Edge Function
- Authentication: Supabase Auth
- Persistent memory: authenticated Supabase-backed memory with local fallback
- Multimodal input: up to 5 attachments per request
- Optional media generation: image and short-video Edge Functions

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

The Python/pytest contract suite in tests/ covers core initialization, the five-file boundary, overflow rejection, and workspace switching. An optional authenticated gateway smoke test is skipped unless its environment variables are explicitly provided.

## GitHub Pages

.github/workflows/deploy-pages.yml validates JavaScript syntax and required site files before publishing the site artifact.

## Project direction

Acerola should grow through explicit, authenticated and allowlisted capabilities. New external-account actions and other meaningful side effects should require appropriate authorization and confirmation.
