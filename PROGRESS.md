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
- [ ] Phase 1: The jungle  ← in progress
  - [x] Git, progress file, local server config
  - [ ] Project skeleton (Three.js, no build step)
  - [ ] Jungle ground, trees, rocks, logs, plants
  - [ ] Rain, morning light, fog, rain sound
  - [ ] Ninja moves with controller/keyboard, overhead camera
  - [ ] Browser test + save point
- [ ] Phase 2: Fighting
- [ ] Phase 3: Co-op mode
- [ ] Phase 4: Drops and hazards
- [ ] Phase 5: VS mode
- [ ] Phase 6: 1-player first-person mode
- [ ] Phase 7: Menus, polish, publish

## Notes and decisions made while building
- Three.js r170 loads from the jsDelivr CDN through an import map, so there's nothing to install.
- Phase 1 builds the ninja and jungle from code-made shapes. Swapping in free asset-pack models needs a download, which waits for the user's OK.
