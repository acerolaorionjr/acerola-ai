# Security

## Acerola AI security baseline

Acerola AI uses a browser client, Supabase Auth/Edge Functions, a server-side AI gateway, and a server-owned memory table.

### Current controls

- Supabase Edge Function `acerola-ai-gateway` requires a valid user JWT (`verify_jwt=true`).
- OpenAI credentials remain server-side in Supabase secrets and are never shipped to the browser.
- The browser uses only a Supabase publishable key.
- Persistent memory is isolated by the authenticated Supabase user ID and is accessed by the gateway with server privileges.
- Direct Data API access to `public.acerola_memory` is revoked for `anon` and `authenticated`; the gateway is the only application data path.
- AI requests have server-side message, body, attachment-count, per-file-size, total-file-size, MIME, timeout, and rate-limit controls.
- Uploaded files and conversation context are treated as untrusted data and are explicitly separated from system instructions.
- Gateway responses use `Cache-Control: no-store` and security-related response headers.
- GitHub Pages deployment uses least-privilege permissions, `persist-credentials: false`, and pinned GitHub Action commit SHAs.
- Secrets and environment files are excluded by `.gitignore`.

## Remaining production hardening

1. Keep Supabase leaked-password protection enabled if password authentication is introduced.
2. Add CAPTCHA/Turnstile protection before scaling anonymous sign-ins beyond a small personal deployment.
3. Monitor OpenAI and Edge Function usage to detect abuse and unexpected cost spikes.
4. Keep the gateway source version-controlled and deploy it through CI/CD rather than editing production code manually.
5. Replace browser `localStorage` persistence for sensitive long-term data with server-backed storage if Acerola AI begins handling sensitive personal information.

## Incident rule

Never commit OpenAI, Supabase secret/service-role, GitHub, or other privileged credentials to this repository. If a privileged secret is exposed, rotate it immediately and investigate its use.
