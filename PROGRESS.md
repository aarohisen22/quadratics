# Progress

Read this first when picking the game back up in a new session. The plan is in `PLAN.md`.

## How to run
```
cd ~/Documents/Game
python3 -m http.server 8080
```
Then open http://localhost:8080 (add `?low` for low graphics).

## How to resume
- `git log --oneline` shows the save points. Each one is a working state.
- If the last session was cut off mid-step, `git status` shows unsaved edits. `git stash` (or `git checkout -- .`) returns to the last save point.

## Status
- [x] Planning (PLAN.md)
- [x] Phase 1: The jungle (waiting on the kids' playtest)
  - [x] Git, progress file, local server config
  - [x] Project skeleton (Three.js, no build step)
  - [x] Jungle ground, trees, rocks, logs, plants, puddles, mist
  - [x] Rain, morning light, fog, rain sound
  - [x] Ninja moves (keyboard tested; controller code written but NOT tested with a real controller yet), overhead camera
  - [x] Browser test (60 fps, no errors) + save point
- [x] Phase 2: Fighting (waiting on the kids' playtest)
  - [x] Uzi (60 bullets, tracers, muzzle flash, sparks, aim help), shurikens (5, interrupt samurai attacks)
  - [x] Samurai: chase, raise katana (dodge window), strike, recover; fall and fade when defeated
  - [x] Health bar with number, ammo counts, hurt flash, level banner, defeat screen + try again
  - [x] Levels: +2 samurai and +15% health/damage each level; ammo refills on level clear (until Phase 4 drops)
  - [x] Sound effects made in code (sound.js), no audio files
  - Tested: game logic checked step by step in the browser. Tracers and sparks were NOT viewed live (browser pane was hidden)
- [x] Phase 3: Co-op mode (waiting on the kids' playtest)
  - [x] Start menu: 1 Player / 2 Player Co-op (stick/arrows + A/Enter, or click)
  - [x] Second brother (blue headband); controller assignment: 2 pads = one each; 1 pad = keyboard+mouse & pad; 0 pads = WASD+mouse & arrow keys
  - [x] Revive: stand within 2 m for 2.5 s → back with 40% health; ring + "Reviving…%" on HUD; downed brothers return with 50% at the next level
  - [x] Brothers can't get more than 24 m apart; camera zooms out to fit both
  - [x] Defeat when both are down; A/Enter = try again, B/Esc = menu
  - Tested in browser by stepping the game (`game.step(dt)` in the console). Not tested with real controllers yet
- [ ] Phase 4: Drops and hazards  ← next
- [ ] Phase 3: Co-op mode
- [ ] Phase 4: Drops and hazards
- [ ] Phase 5: VS mode
- [ ] Phase 6: 1-player first-person mode
- [ ] Phase 7: Menus, polish, publish

## Notes and decisions made while building
- Three.js r170 loads from the jsDelivr CDN through an import map, so there's nothing to install.
- Phase 1 builds the ninja and jungle from code-made shapes. Swapping in free asset-pack models needs a download, which waits for the user's OK.
- Treetops dissolve near the ninjas so the overhead camera can see them (`cutaway` in world.js).
- Files: src/config.js (settings to tune), world.js (jungle), weather.js (light, rain), sound.js, effects.js, combat.js (weapons + levels), samurai.js, hud.js, ninja.js, input.js, camera.js, main.js.
