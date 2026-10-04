# Acerola Game Core

Acerola-connected mobile-first sci-fi precision platformer built with lightweight Canvas 2D.

## Current playable systems

- Six handcrafted sectors: FIRST CONTACT, THE FLOOR REMEMBERS, TRUST NOTHING, STATIC HUM, FALSE FLOOR, and SIGNAL LOST.
- Fast retries with coyote time, jump buffering, variable jump height, checkpoints, hazards, and moving platforms.
- Three Signal Shards per sector (18 total) with persistent collection state.
- Sector timer and best-time tracking.
- Adaptive pacing based on actual deaths and progress: NORMAL, FOCUS, SUPPORT, and PRESSURE.
- Acerola companion observes real gameplay events and can give concise non-spoiler hints or commentary.
- Graceful local companion fallback when the AI gateway is unavailable.
- Guest/local progression plus optional Google sign-in and Supabase cloud saves.
- Replay mode for unlocked sectors without moving the main continue point.
- Player profile with sectors, fails, shards, and achievements.
- Lightweight procedural sound effects.
- Mobile touch controls plus keyboard controls.
- No copied Level Devil art, characters, levels, names, or proprietary content.

## Save and account behavior

Local progress is stored in browser storage. Signed-in progress is stored in the game_saves Supabase table under the authenticated user's ID. Guest play does not require an account.

Google sign-in is optional. If a guest signs in, the local run remains in memory/browser storage and is merged conservatively with any existing cloud progress after the authenticated session returns.

For Google OAuth to work on the deployed site, the game's GitHub Pages URL must be present in the Supabase Auth redirect allowlist and Google provider configuration must be enabled.

## Verification notes

The source currently passes a JavaScript parse check and all DOM IDs referenced by game.js are present in index.html. Live device/browser gameplay still needs to be exercised on the deployed Android target because a repository-side check cannot simulate touch input, browser audio policies, OAuth redirects, or the live AI gateway.

## Design rule

Only keep features that actually improve the playable loop. Avoid fake buttons, unfinished generators, unnecessary currencies, or systems that cannot function on the target device.
