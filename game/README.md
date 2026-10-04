# Acerola Game Core

First playable slice of the Acerola-connected platformer.

## Design decisions

- Mobile-first 2D precision platformer.
- Short levels and instant retry.
- Simple left/right/jump controls.
- Three handcrafted sectors for the first build.
- Acerola observes actual game events: level start, death, level completion, and run completion.
- The AI can provide non-spoiler hints and contextual commentary.
- Anonymous Supabase sessions reuse the existing Acerola gateway architecture; no provider secret is stored in the game.
- Lightweight Canvas rendering instead of a large game engine for the first slice, prioritizing compatibility with lower-end Android devices.

## Future gates

Only add a feature if it is actually playable and improves the core loop:
1. More trap types.
2. Checkpoints.
3. AI-driven challenge modifiers.
4. Game memory/profile integration.
5. Sound and music.
6. Art/animation pass.
7. Optional offline mode with AI features gracefully unavailable.

Do not copy Level Devil's art, characters, levels, names, or proprietary content.
