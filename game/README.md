# Ibadan Life 3D

Ibadan Life is the Acerola-connected 3D life simulation built for mobile-first play.

## Current playable systems
- 3D Ibadan-inspired city with Bodija Market, UCH, University, Dugbe, roads, homes, offices, trees and NPCs.
- Mobile touch movement and camera rotation.
- Five branching character starts: Lapo, Average, Comfortable, Nepo Baby and Wealthy.
- Starting backgrounds change money, debt, family support, home, vehicle, reputation, progress and starting location.
- Interactive smartphone with Jobs, Messages, Bank, Ride, Boutique, Food, Business, Advertising, Investments, Map, Travel and Events.
- Playable Jobs choices with reputation requirements and cash/energy/progress consequences.
- Playable Bank actions for savings and debt repayment.
- Local browser persistence for the selected starting background.
- Lightweight 3D rendering designed for mobile devices.

## Economy direction
The game is being expanded around a connected loop:

**Work → Earn → Bank → Save/Repay → Business → Advertise → Invest → Property → Vehicles → Travel**

Different starting backgrounds are intended to create genuinely different routes through that economy.

## Design rule
Only keep features that actually work and improve the playable loop. Avoid fake buttons, unnecessary currencies, copied game assets, or systems that cannot function on the target device.

## Verification
Repository-side checks can validate source structure and JavaScript parsing, but real Android gameplay still needs testing on the deployed GitHub Pages build for touch input, browser performance, audio policy and OAuth/network behavior.
