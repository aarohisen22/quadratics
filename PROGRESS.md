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
- [x] Feedback round 2 (kids' "Part 2" note) (waiting on the kids' playtest)
  - [x] 1. Fallen trees stay down on try-again; breakable trees now have a yellow-green crown that falls with the trunk (before, from above they were just a bare pole, so a falling one looked like a new tree appearing)
  - [x] 2. Oni / demon masks on the samurai (red face, angry brows, glowing eyes, fangs, horns; helmet raised so the face shows; `buildOniMask` in samurai.js is reusable for the boss)
  - [x] 3. Water foam around legs when wading: foam patches drift downstream and fade, splashes when moving (foam.js; ninjas and samurai)
  - [x] 4. Minimap bottom-left in overhead modes: stream, landmarks, brothers (arrows), samurai, crates, boss (minimap.js; turns with the camera). Controller hint moved to bottom-center
  - [x] 5. Weapons carried on belt and back + switch animation: Uzi in hip holster, shotgun slung on back, smoke bombs on belt, katana handle leaves the sheath; 0.5 s switch (put away → reach → draw), no firing mid-switch; first person: old weapon drops away, new one comes up from the belt or over the shoulder (katana); left hand pulls shurikens from the pouch
  - [x] Fixes after kids' check: first-person shuriken no longer a "third hand" (left hand lets go of the gun, reaches to the belt, flicks a real star shape); new smoke bomb look (steel shell, red band, paper cap, lit fuse); smoke lasts 5 s and thins out over the last 40%; minimap now also in first person
  - [x] 6. Samurai slide down vines instead of popping in: one after another (~0.5 s apart), 1.4 s slide gripping with both hands, thump + dust on landing, vine pulls back up; can't be hit or attack until landed; hidden from the map while still up in the trees
  - [x] 7. Samurai mix attacks (config.js `samurai.attacks`): quick jab (0.28 s warning, 7 dmg at level 1, narrow, lunges; step aside), side slash (0.45 s, 12 dmg, wide flat sweep from either side; back off), overhead chop (0.8 s with red glowing blade, 22 dmg). Shurikens still interrupt any windup
  - [x] 8. Enemy archers (green armor, quiver; keep 7-15 m away, 0.9 s draw with red aim line on the ground, arrow 16 m/s you can sidestep, sticks in trees) and nunchuck fighters (blue armor, faster, spin-up then 3-hit combo). Archers from level 3, nunchucks from level 4, 20% each +3%/level up to 35% (config.js `samurai.mix`); a toast warns the first time each appears
  - [x] 9. Giant Oni warlord mini boss after levels 5, 10, 15… (boss.js, config.js `boss`): comes down a thick vine with a roar, 2.3x size, studded club; wide club swing (20 dmg) and ground slam with red ring (32 dmg, knock-back, camera shake); calls 2 samurai at half health; shurikens don't interrupt him; health bar at the top + big marker on the minimap; 800 health, +50% each appearance
- [x] Feedback round 3 (parent's list) (waiting on the kids' playtest)
  - [x] Uzi ammo 60 → 100 (crates +80, carry up to 250); health crates (22% of crates, white with red crosses, green beam and green on the map, +40 health)
  - [x] Pause button (top-right ❚❚) + Esc / P / Start pause menu (Resume / Restart / Main menu, mouse or controller); also pauses when you leave the window
  - [x] Samurai vines only hang from real tree branches: samurai (and the boss and his helpers) spawn under a big tree's leaf clump (world.canopySpots), vine length matches that tree
  - [x] Enemies jump over logs and low walls and steer around boulders, trees, ruins and the plane (samurai.js `steer`); if still stuck for 0.6 s they try the other way round and hop. Tested 16 random obstacles: all got through in 0.7-3.4 s
  - [x] Gatling gun: crate special (half as likely as the others, config `specials.weights`), 150 rounds, barrels spin up 0.5 s (whirr) then ~20 shots/s, 9 dmg each; walk at 70%; slung on the back when not held; overhead + first person
  - [x] Hiding: temple ruins top (6.5 m) and around each collapsed hut (4.5 m) are hideouts (faint green ring on the ground + map): samurai lose track unless within 3.5 m; card says HIDDEN. 5 treehouses (treehouses.js, brown squares on the map): jump at the rope ladder to climb, platform 4 m up with railing; melee samurai wait below, archers aim up; walk off the edge to drop down
  - [x] Twin-blade Ronin boss (ronin.js, config `ronin`): 1.5x size, straw hat, purple armor, katana in each hand, 450 health (+50% each time); jabs and double slashes up close; from 5-13 m a red streak (0.7 s) shows his dash path, then he dashes through it (22 dmg at level 3), step aside to dodge, shuriken cancels it. Bosses: Ronin after 3, 8, 13…, Oni Warlord after 5, 10, 15… (config `boss.every` / `boss.roninAt`)
- [x] Feedback round 4 (parent's list, 2026-11-17) (waiting on the kids' playtest)
  - [x] Smoke bomb is one soft grey cloud (round, soft puffs) instead of confetti-like bits
  - [x] Katana never breaks and has its own slot once found (switch: Uzi → special → katana); damage 30 → 26; a second katana crate gives ammo. Fire again quickly for a 4-move combo: slash, backhand, overhead chop, thrust (config `specials.katana.moves`)
  - [x] Firing a gun from a hideout or smoke gives you away for 4 s (card says SPOTTED!); shurikens and the katana stay silent (config `hiding.revealSeconds`)
  - [x] Ronin defends when he isn't attacking: blocks bullets (60% when facing you) and shurikens (50%), parries the katana and counters, leaps aside (35%, then may dash straight back); health 450 → 650 (config `ronin.defense`). Hit him during his windups
  - [x] Samurai camp (outpost.js) at (-6, -30): stake wall with a gate, tents, commander's curtain tent, banners, torches, campfire, weapon rack. Red-ribboned posts 38 m out mark samurai territory (dashed ring + flag on the minimap). Waves: 60% march out of the gate, the rest slide down vines; after each wave a 30–40 s quiet countdown (15 s before the first; bosses too) that only runs inside territory; leave it and no more come, and samurai past the posts +8 m give up and walk back to camp (config `world.outpost`, `levels.quietSeconds` etc.)
  - [x] Samurai redesign: laced lamellar armor (lacing in their kind's color), kabuto with gold crest, neck guard and side flaps, iron menpō face guard with moustache and throat guard (no glowing eyes), hakama, shin guards, sandals, banner on the back. Ronin: no crest or banner. Oni Warlord: carved lacquer Oni mask, no glow
  - [x] Treehouse climb (third person): rung by rung, hand reaches while the opposite foot steps up, weapon put away, then hauls himself over the edge and stands
- [x] Feedback round 5 (first controller playtest, 2026-11-17)
  - [x] Controller: letting go of the right stick keeps your aim (mouse aiming switches off while the controller is used, back on when the mouse really moves). Tested with a simulated controller
  - [x] Campfire burns: 25 health/s with embers and a toast; samurai burn too (config `world.outpost.fireDamage`)
  - [x] 20 s between waves (`levels.quietSeconds`), and each wave in a level brings 2 more samurai than the one before (`levels.extraPerWave`)
  - [x] Jungle 120 m → 180 m (about 2x area): stream and landmarks spread out, twice the trees/plants, 6 huts, 7 treehouses 32 m+ apart. Same frame rate in the preview pane
  - [x] Camp at (-10, -48), wall 15 m, territory 58 m: gatehouse (pillars, curved top beam, roof, crest plaque, lanterns, open studded doors), two watchtowers, 6 tents, 8 torches, 14 banners, 2 weapon racks. Camp guards: 4 + 1 per level (max 12) at posts with patrols, attack within 12 m of the wall, don't count toward waves, replaced each level (`levels.guards` etc.). Samurai route round the wall and through the gate to get in or out (samurai.js `routeVia`)
  - [x] Smoke "colourful particles": the kids' screenshot showed coloured speckle noise over the cloud. That's the browser's anti-fingerprinting noise (Safari Advanced Fingerprinting Protection / Brave / privacy add-ons) added to canvas-drawn pictures. Soft see-through textures (smoke, mist, sunbeams, muzzle flash, foam) are now computed pixel by pixel (src/pixeltex.js), not drawn on a canvas. Solid canvas textures (armor, crates, stone, flags) still use canvas: the noise is hard to see on them, but if speckles show up there, convert them the same way
- [ ] Japan makeover (plan in `PLAN-japan.md`, approved 2026-11-18)  ← next
  - [x] A. Big-world foundations: 420 m map (5.4x area), ground in 60 m tiles + plants/trees batched per tile (only what's on screen is drawn), obstacle grid (world.obstaclesIn / obstaclesNear / blocked), areas.js (6 areas with kanji names), minimap shows 90 m around you, M key / controller Back = full map with area names. Camp moved to the cedar forest (-130, -55). 15 treehouses. Tested: ~3 ms a frame at the start, ~5.6 ms in a fight (preview pane), no errors. Samurai still get stuck on the plane wreck's long side (it goes in step C)
  - [x] B. Japanese forest (src/flora.js): each area has its own mix (MIX table). Sugi (narrow dark spires), hinoki (broader, lighter), akamatsu red pines (bent orange trunk, flat needle pads), momiji maples (one colour per tree: red / orange / gold), sakura (pink), bamboo clumps (jointed stalks + leaf sprays; thick in the bamboo grove, patches elsewhere), sasa bamboo grass, moss cushions on rocks, mossy logs. Dead snapped cedars (rust-brown) still fall. Sacred cedar with shimenawa rope + shide papers on shrine hill (world.sacredTree). Forest floor coloured per area (needles, bamboo litter, red leaves, village grass, castle gravel, shrine moss). Leaves are in world.foliage batches for the seasons. Palms, rainforest trees and hanging vines are gone. Tested: 3.6–4.2 ms a frame in every area (preview pane), falling trees and waves work, no errors
  - [x] C. Japanese places (src/landmarks.js, src/jptext.js): shrine hill just north of the start (worship hall with copper roof and 森神社 plaque, big torii, komainu, stone lanterns, temizuya, ema wish board; hideout on top) reached by a tunnel of red torii (also a hideout); five-storey pagoda (hideout ring); collapsed thatched minka in the bamboo grove, cedar forest, maple valley and wild forest (hideouts); village with thatched farmhouses (茶屋 / 宿屋 noren and lanterns), white kura (米 crest), red arched taiko bridge, 6 rice paddies, watermill with turning wheel, scarecrow; paths from shrine hill to every area (on the minimap) with stone lanterns, red-bibbed jizō, signposts (竹林へ etc.) and area name posts; a wooden bridge where a path crosses the stream; castle on a raised platform: ishigaki stone walls, moat (you wade in it), earth causeway up to the gatehouse, plaster parapet, 3 corner turrets, three-tier keep with gold shachihoko. Bridges and the causeway are walkable (world.heightAt = land or bridge deck; world.terrainAt = land only). Treehouses are now lookout towers (monomi-yagura) on four posts with a roof, same climbing. Plane wreck, temple ruins and stilt huts removed. Tree warning toast is bilingual (危険！). Rain looks up the ground once per drop (frame 4.7 → 2.7 ms). Tested in the preview: walking over both bridges, up the causeway, into the moat (wading), climbing a tower; no errors
  - [ ] D. 6 ranks: ronin, ashigaru (yari/yumi/teppo), samurai, hatamoto, Daimyo boss, Shogun boss (old bosses + nunchucks removed)
  - [ ] E. Area campaign: a camp per area, leaders, next-camp marker, victory + Round 2
  - [ ] F. Seasons: spring petals, summer rain, autumn maples, winter snow
  - [ ] G. Title chosen by the kids (ideas: 静寂の森 Seijaku no Mori, 森林浴 Shinrin-yoku, 森の心 Mori no Kokoro)
- [ ] Phase 7: Menus, polish, publish (after the Japan makeover; pause menu already done in round 3)

## Notes and decisions made while building
- Three.js r170 loads from the jsDelivr CDN through an import map, so there's nothing to install.
- Phase 1 builds the ninja and jungle from code-made shapes. Swapping in free asset-pack models needs a download, which waits for the user's OK.
- Treetops dissolve near the ninjas so the overhead camera can see them (`cutaway` in world.js).
- Files: src/config.js (settings to tune), world.js (jungle), outpost.js (samurai camp + territory), weather.js (light, rain), sound.js, effects.js, combat.js (weapons + levels + arrows + boss fights), samurai.js (sword/archer/nunchuck kinds, vines, attacks, obstacle steering), boss.js (Oni Warlord), ronin.js (Twin-blade Ronin), treehouses.js, foam.js (water foam), minimap.js, hud.js, ninja.js, input.js, camera.js, main.js.

## Where we left off (2026-11-17, after feedback round 5, before Phase 7)
Everything through Phase 6 and feedback rounds 2–5 is committed. To resume, open this folder and say "continue the game from PROGRESS.md".

**Phase 7 to-do (menus, polish, publish):**
- Settings screen: volume, mouse sensitivity, low graphics toggle (currently `?low` in the URL)
- How-to-play / controls screen; game title + brothers' names from the kids
- Publish to GitHub Pages for a shareable link (needs the parent's GitHub account; ask before pushing anything)

**Still never tested by a person:** real game controllers, sounds by ear, mouse grab (pointer lock) in first person.

**Ideas raised but not done:** professional animated character models from free packs (needs downloads, ask first); shots that follow up/down aim in first person; single-player quests/missions; online multiplayer.

**Testing tip: jump to the boss:** in the console, `game.paused = true; game.combat.reset(); game.combat.level = 5; game.combat.wave = game.combat.waveTotal = 3;` then `game.step(1/60)` a few hundred times. If the browser pane is hidden, screenshots can be stale; render with `game.renderer.render(game.scene, game.camera)` and copy `game.renderer.domElement.toDataURL()` into an <img> on the page.

**Testing tip for the next session:** in the browser console, `game.paused = true` stops the loop and `game.step(1/60)` advances one frame; `game.players`, `game.combat`, `game.sky`, `game.world` are exposed.
