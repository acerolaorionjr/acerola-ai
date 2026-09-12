# Acerola AI

A personal AI agent project by AcerolaOrion.

Acerola AI is designed to grow beyond a normal chatbot into a personal intelligence system with reasoning, persistent memory, voice interaction, tool execution, and modular agent architecture.

## Current milestone — Agent Core v0.9

The current foundation includes:

- cyberpunk/dark responsive web interface
- Agent Core orchestration layer
- server-side OpenAI model gateway
- GPT-5.6 Luna through the gateway
- persistent Supabase memory per authenticated user
- local memory fallback when authentication is unavailable
- bounded conversation context stored locally
- keyword-based memory search
- safe arithmetic calculator without `eval`
- allowlisted tool routing and action execution
- UI module navigation through agent actions
- safe UI notifications
- browser speech-recognition input where supported
- system status and capability reporting
- duplicate conversation-turn protection

## Architecture

```text
User
  ↓
Acerola AI UI
  ↓
Agent Core
  ├── Conversation Manager
  ├── Memory Manager
  ├── Tool Router
  └── Action Engine
       ↓
  Server Gateway
       ↓
  OpenAI Responses API

Persistent memory:
  Agent Core → authenticated Supabase Edge Function → acerola_memory
```

The browser only contains the Supabase publishable key. OpenAI and Supabase service-role secrets remain server-side.

## Security

- Supabase Row Level Security is enabled on `public.acerola_memory`.
- Memory access is scoped to the authenticated user by the gateway.
- The AI gateway requires a valid Supabase JWT.
- The gateway validates planned tool calls against the registered allowlist.
- Arbitrary tool names and arbitrary code execution are not permitted.
- Provider API keys, service-role keys, and access tokens must never be committed to this repository.

## Run

Open `index.html` in a browser, or publish the repository with GitHub Pages.

## Project direction

Future agent capabilities should be added through explicit, allowlisted tools and authenticated server-side integrations. Actions that affect external accounts or create meaningful side effects should require appropriate authorization and confirmation rather than being executed solely from model output.
