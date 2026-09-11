# Acerola AI

A personal AI agent project by AcerolaOrion.

Acerola AI is intended to grow beyond a normal chatbot into a personal intelligence system with:

- AI reasoning
- persistent long-term memory
- voice interaction
- tool and action execution
- a modular agent architecture
- a web interface

## Current milestone — Foundation v0.1

The first implementation establishes a dependency-free web interface with:

- cyberpunk/dark Acerola AI UI
- responsive layout for phone and desktop
- local browser memory using `localStorage`
- explicit `remember`, `forget`, and `clear memory` commands
- browser speech-recognition input where supported
- system/status panel
- provider-safe frontend design: no secret API keys are placed in client code

## Architecture direction

```text
User
  ↓
Acerola AI UI
  ↓
Agent Core
  ├── Model Gateway
  ├── Memory Manager
  ├── Tool Router
  └── Action Executor
       ↓
  External services / APIs
```

The next integration layer is a server-side model gateway and persistent memory backend. Secrets must remain server-side; the browser should never contain provider API keys or service-role credentials.

## Run

Open `index.html` in a browser, or publish the repository with GitHub Pages.

## Security rule

Never commit API keys, access tokens, Supabase service-role keys, or other secrets to this repository.
