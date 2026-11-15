# Jungle Ninja Brothers: Build Plan

A web-based 3D shooter. Two ninja brothers (in their 20s) with Uzis and shurikens fight samurai in a rainy morning jungle.

## What we decided
| Topic | Decision |
|---|---|
| First version | Local co-op and VS on one computer, plus a 1-player first-person mode |
| Online multiplayer | Left out for now |
| Local 2-player camera | One shared overhead camera |
| Look | Detailed 3D using free, animated asset packs |
| Controls | Two game controllers (plus mouse and keyboard for the 1-player FPS mode) |
| Tone | Teen: grittier hit effects, no gore |
| Kids' role | Designers and testers |
| Hosting | Free public link (GitHub Pages) |
| Weapon drops | Ammo refills and special weapons, every 30 seconds |

## Tech (kept simple)
- **Three.js**: 3D in the browser. No game engine to install.
- **No build step**: plain JavaScript files loaded straight by the browser, so the same folder runs locally (`python3 -m http.server 8080`) and on GitHub Pages.
- **glTF models** from free packs (e.g. Quaternius, Kenney, Poly Pizza; CC0 or similar license) for the ninjas, samurai, jungle plants, trees and weapons. Each model's credit goes in `CREDITS.md`.
- **Browser Gamepad API** for the two controllers. **Pointer Lock** for mouse-look in first person.
- **Simple custom physics**: ground height, collision with tree trunks and rocks, and raycasts for bullets. No physics engine.
- All tuning numbers (health, damage, ammo, timers, level scaling) live in one file, `src/config.js`, so they're easy to change after playtests.

## Phases (each ends in something the kids can play)

### Phase 1: The jungle
- Jungle map: uneven ground, dense trees, ferns, rocks, broken fallen logs.
- Heavy rain (particles and sound), morning light, mist and fog, wet-looking surfaces.
- One ninja walks around with a controller under the overhead camera.
- **Playtest:** does the jungle feel right? Is it too dark, too foggy, too big?

### Phase 2: Fighting
- **Uzi**: fast fire, starts with 60 bullets, muzzle flash, hit sparks.
- **Shurikens**: a few in his pockets, thrown with a separate button, high damage.
- **Samurai**: chase the player and attack with a katana; teen-level hit reactions; they fall and fade out.
- **Health bar with a number** on screen ("health 74 / 100"), as the notes asked.
- **Playtest:** is shooting fun? Are the samurai too easy or too hard?

### Phase 3: Co-op mode (2 controllers)
- Both brothers on screen. The shared camera zooms out as they move apart, and they can't wander off-screen.
- Each level: clear all the samurai to advance.
- Each new level shuffles where the samurai, logs and drop spots are. Samurai get **more health, more damage, and more of them**.
- If one brother goes down, the other can revive him. If both go down, it's game over and the screen shows the level they reached.

### Phase 4: Drops and hazards
- **Every 30 seconds** a crate lands somewhere random: usually **ammo** (60 bullets), sometimes a **special weapon**. Starter specials: katana, smoke bomb, shotgun. The kids can invent more.
- **Falling trees**: broken trees sometimes topple. A shadow or creak warns you first, and getting hit does big damage. This works on samurai too.

### Phase 5: VS mode
- Brothers spawn apart in the jungle and fight each other. Crates still drop every 30 seconds, and trees still fall.
- Default: first to 5 kills wins, with respawn after a few seconds. The kids can change this.

### Phase 6: 1-player first-person mode
- The same co-op levels, seen through the ninja's eyes.
- Mouse and keyboard (WASD to move, mouse to aim) or a controller.
- First-person Uzi and hands model, crosshair, and the same health bar.
- This mode is the starting point for "Quests and Missions" later.

### Phase 7: Menus, polish, publish
- Title screen and mode select (Co-op, VS, Solo FPS), a "plug in 2 controllers" check, and pause.
- Sound effects and jungle ambience, plus settings (volume, sensitivity).
- Publish to GitHub Pages to get a shareable link. **This needs a GitHub account (yours).**

## Later (not in version 1)
- **Single-player Quests and Missions**: needs the kids to write down what the missions are.
- **Online multiplayer** (Squad and Free for All): needs a server, plus friends-only rooms with join codes.

## Defaults I'll use unless the kids say otherwise
- Health 100. Uzi damage 10 per bullet. Shuriken damage 35. Start with 5 shurikens.
- Level 1 has 5 samurai. Each level adds 2 samurai and makes them 15% tougher and stronger.
- No reloading: the Uzi fires until the 60 bullets are gone, then you need an ammo drop.
- Both brothers look the same apart from a colored headband (red or blue), so you can tell them apart from above.

## Questions to ask the kids along the way
1. What are the brothers' names, and what's the game called?
2. What special weapons should drop?
3. Do samurai only use swords, or should some use bows?
4. What are the "Quests and Missions"? (The top of page 2 of the notes was cut off in the photo. Was there more?)

## Honest limits
- "Detailed 3D" from free packs looks like a good indie game, not a big console game. Custom ninja models would cost money or a lot of time.
- Lots of rain, fog and shadows can slow down older laptops. There will be a "low graphics" setting.
- The first-person mode has to run in Chrome, Edge or Firefox on a computer. Phones and tablets are not supported.
