# Progress

Read this first when picking the game back up in a new session. The plan is in `PLAN.md`.

## How to run
```
cd ~/Documents/Game
python3 tools/serve.py
```
Then open http://localhost:8080 (this server turns off browser caching so refreshes show the latest code) (add `?low` for low graphics).

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
- [x] Graphics + sound upgrade (asked for by parent): detailed code-built ninja (hood, eyes, sash, straps, pouches, katana on back, jointed arms/legs), realistic Uzi / shotgun / katana models, bigger characters (1.15x) and closer camera, muzzle flash burst, brass shell casings, layered realistic weapon sounds with outdoor echo (sound.js)
- [x] Phase 4: Drops and hazards (waiting on the kids' playtest)
  - [x] Supply crate falls every 30 s (first at 10 s) with a light beam: ammo (+60 bullets, +2 shurikens) or a special weapon
  - [x] Specials: shotgun (8 shells, 7 pellets), katana (25 slashes, 130° arc), smoke bombs (3; samurai can't see you in the smoke). Y / Q / , to switch weapons
  - [x] Broken trees: one near you creaks + shows a red zone, then falls (40 damage, samurai take 80) and leaves a log. Shoot a broken tree 14 times to knock it over on purpose
  - Tested by stepping the game in the browser (game.paused = true; game.step(1/60)). Not tested with real controllers
- [x] Phase 5: VS mode (waiting on the kids' playtest)
  - [x] Menu has 3 modes: 1 Player / 2 Player Co-op / 2 Player VS
  - [x] Brothers start ~20 m apart; every weapon (Uzi, shotgun, katana, shurikens) hits the other brother; no friendly fire in co-op
  - [x] Knock-down = point for the other brother (trees count too); respawn after 3 s away from the opponent; first to 5 wins; winner screen in his color
  - [x] Crates every 30 s and falling trees still on; no samurai
  - [x] Fix: aim help now aims from the gun tip / throwing hand, so shurikens no longer just miss
- [x] Feedback round 1 (from parent/kids):
  - [x] Katana weaker: 30 damage, 100° arc, hits at most 2 per swing, 15 swings
  - [x] Samurai slower (2.8 vs ninja walk 5)
  - [x] Levels come in waves (2 per level, 3 from level 5; next wave when 1 samurai left or after 35 s)
  - [x] Weather changes by level (sky.js): rain (1-2) → clearing with sunbeams + birds (3-4) → golden afternoon (5-6) → thunderstorm with lightning (7-8) → dusk with fireflies (9-10), then repeats. VS picks random weather
  - [x] Landscape: stream winding through a valley (wading slows you; stepping stones), temple ruins on a hill, crashed cargo plane, 3 collapsed stilt huts (landmarks.js) — all solid cover
- [x] Phase 6: 1-player first-person mode (waiting on the kids' playtest)
  - [x] 4th menu option "1 Player First-Person": same levels/waves/weather/crates/trees, seen through the ninja's eyes
  - [x] Mouse look (click to lock the mouse, Esc pauses, click to continue) or right stick; WASD/left stick move relative to view
  - [x] Hands + weapon on screen (fps.js) for Uzi, shotgun (pump moves), katana (slash), smoke bombs, left-hand shuriken flick; walk bob and recoil
  - [x] Crosshair with red hit marker; less aim help (4°) than overhead
  - Tested by stepping the game; pointer lock (mouse grab) can't be tested automatically — try it by hand
- [ ] Feedback round 2 (kids' "Part 2" note)  ← in progress
  - [x] 1. Fallen trees stay down on try-again; breakable trees now have a yellow-green crown that falls with the trunk (before, from above they were just a bare pole, so a falling one looked like a new tree appearing)
  - [x] 2. Oni / demon masks on the samurai (red face, angry brows, glowing eyes, fangs, horns; helmet raised so the face shows; `buildOniMask` in samurai.js is reusable for the boss)
  - [x] 3. Water foam around legs when wading: foam patches drift downstream and fade, splashes when moving (foam.js; ninjas and samurai)
  - [x] 4. Minimap bottom-left in overhead modes: stream, landmarks, brothers (arrows), samurai, crates, boss (minimap.js; turns with the camera). Controller hint moved to bottom-center
  - [x] 5. Weapons carried on belt and back + switch animation: Uzi in hip holster, shotgun slung on back, smoke bombs on belt, katana handle leaves the sheath; 0.5 s switch (put away → reach → draw), no firing mid-switch; first person: old weapon drops away, new one comes up from the belt or over the shoulder (katana); left hand pulls shurikens from the pouch
  - [x] Fixes after kids' check: first-person shuriken no longer a "third hand" (left hand lets go of the gun, reaches to the belt, flicks a real star shape); new smoke bomb look (steel shell, red band, paper cap, lit fuse); smoke lasts 5 s and thins out over the last 40%; minimap now also in first person
  - [ ] 6. Samurai slide down vines instead of popping in
  - [ ] 7. Samurai mix attacks: quick jab / side slash / overhead chop, different damage
  - [ ] 8. Enemy archers (bow, dodgeable arrows) and nunchuck fighters
  - [ ] 9. Giant Oni warlord mini boss after levels 5, 10, 15…
- [ ] Phase 7: Menus, polish, publish  ← after feedback round 2

## Notes and decisions made while building
- Three.js r170 loads from the jsDelivr CDN through an import map, so there's nothing to install.
- Phase 1 builds the ninja and jungle from code-made shapes. Swapping in free asset-pack models needs a download, which waits for the user's OK.
- Treetops dissolve near the ninjas so the overhead camera can see them (`cutaway` in world.js).
- Files: src/config.js (settings to tune), world.js (jungle), weather.js (light, rain), sound.js, effects.js, combat.js (weapons + levels), samurai.js, hud.js, ninja.js, input.js, camera.js, main.js.

## Where we left off (paused 2026-11-15, before Phase 7)
Everything through Phase 6 is committed. To resume, open this folder and say "continue the game from PROGRESS.md".

**Phase 7 to-do (menus, polish, publish):**
- Pause menu in every mode (Esc / Start button): resume, restart, back to menu
- Settings screen: volume, mouse sensitivity, low graphics toggle (currently `?low` in the URL)
- How-to-play / controls screen; game title + brothers' names from the kids
- Publish to GitHub Pages for a shareable link (needs the parent's GitHub account; ask before pushing anything)

**Still never tested by a person:** real game controllers, sounds by ear, mouse grab (pointer lock) in first person.

**Ideas raised but not done:** professional animated character models from free packs (needs downloads, ask first); shots that follow up/down aim in first person; single-player quests/missions; online multiplayer.

**Testing tip for the next session:** in the browser console, `game.paused = true` stops the loop and `game.step(1/60)` advances one frame; `game.players`, `game.combat`, `game.sky`, `game.world` are exposed.
