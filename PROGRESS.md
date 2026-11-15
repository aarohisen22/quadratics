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
- [ ] Phase 2: Fighting  ← next
- [ ] Phase 3: Co-op mode
- [ ] Phase 4: Drops and hazards
- [ ] Phase 5: VS mode
- [ ] Phase 6: 1-player first-person mode
- [ ] Phase 7: Menus, polish, publish

## Notes and decisions made while building
- Three.js r170 loads from the jsDelivr CDN through an import map, so there's nothing to install.
- Phase 1 builds the ninja and jungle from code-made shapes. Swapping in free asset-pack models needs a download, which waits for the user's OK.
- Treetops dissolve near the ninjas so the overhead camera can see them (`cutaway` in world.js).
- Files: src/config.js (settings to tune), world.js (jungle), weather.js (light, rain, sound), ninja.js, input.js, camera.js, main.js.
