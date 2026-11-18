# Plan: Japan makeover: 6 warrior ranks, Japanese forest and buildings, 5x bigger map

## Context
The kids' game (Three.js, `~/Documents/Game`) is set in a rainy tropical jungle with one samurai camp, a crashed plane, stilt huts, palm trees and two bosses. The family wants three changes:
1. All 6 Japanese warrior types: ronin, ashigaru, samurai, hatamoto, daimyo, shogun.
2. Everything should look Japanese: Japanese trees and forests, buildings, artefacts, symbols and writing.
3. A playable area at least 5x bigger.

**Decisions made (from the questions):**
- Ranks rise by area. The big map is split into areas, and each is held by a higher rank. The Daimyo and the Shogun are the bosses.
- The Twin-blade Ronin boss, the Oni Warlord and the nunchuck fighters are removed. Daimyo and Shogun are new bosses. Their useful mechanics (dash streak, ground slam, block/dodge) are reused in new code.
- The plane is replaced by a hilltop shrine and a five-storey pagoda.
- 4 seasons, changing as the brothers move up through the areas.
- Free roam. The next camp is marked on the minimap, and waves start when you walk into its territory.
- After the Shogun: a victory screen, then Round 2 with tougher warriors.
- Writing: world signs in Japanese only. On-screen messages show the Japanese big with English underneath.
- **Title:** a phrase for "a sensei finding peace in a forest". The kids choose in step G. Candidates:
  - **静寂の森, Seijaku no Mori**, "Forest of Stillness". Seijaku is one of the Zen aesthetic ideas: calm and inner peace found in silence. Recommended.
  - **森林浴, Shinrin-yoku**, "forest bathing": finding calm by soaking up the forest.
  - **森の心, Mori no Kokoro**, "Heart of the Forest".

## Research notes (style guide used for building)
**Warriors**
| Rank | Look | Fighting style in game |
|---|---|---|
| Ronin 浪人 | Masterless. Worn kimono, deep woven straw hat (kasa) hiding the face, one sword, no lord's crest | Fast and lightly armoured. Roam in pairs or threes and side-step. Bamboo-grove bandits |
| Ashigaru 足軽 | Foot soldiers. Conical jingasa hat with the lord's crest, simple plate body armour (okegawa-dō) with little lacing, loaned armour | Weak but many, in squads. Three kinds: yari spearmen (long-reach thrust), yumi archers (the current archer behaviour), teppō matchlock gunners (long red aim line, big bang and smoke, slow reload) |
| Samurai 侍 | Laced lamellar armour, kabuto with crest, menpō face mask: the current redesign | The current sword samurai, attacks unchanged |
| Hatamoto 旗本 | "Those under the flag": elite bodyguards. Dazzling black-and-gold armour, tall back banners (sashimono) with crest | Tough (2.5x health). Naginata with wide sweeps, sometimes blocks. Guard the Daimyo and the castle |
| Daimyo 大名 | Lord. Jinbaori surcoat with his crest over the armour, big gilded helmet crest (maedate/wakidate), gunbai war fan | Boss: fan signals call arrow volleys (red zones on the ground), calls hatamoto, uses ground-slam style heavy strikes |
| Shogun 将軍 | Supreme ruler. Gold-trimmed armour, huge crest, jinbaori, tachi sword | Final boss in 3 phases: sword duel with block/dodge; then dash strikes with red streak and a teppō volley line; then enraged |
- Crests (mon): use original, simple shapes (crane, waves, three-comma tomoe, diamonds) on banners, curtains and hats. Do not copy real clans' crests.

**Forest:** Japan's forests are mostly sugi (Japanese cedar: tall, straight, reddish ridged bark, narrow cone crown) and hinoki (cypress) planted forests. There are also bamboo groves (moso bamboo, very tall thin green stalks in dense stands), red pine akamatsu (twisted trunk, orange-red flaky upper bark, flat cloud-like layers), maples (momiji: red in autumn), cherry (sakura) near shrines and villages, and moss-wrapped ancient cedars and rocks (Yakushima). Ground plants: ferns and sasa bamboo grass.

**Buildings and artefacts:**
- Shrines: vermilion torii gates (rows of them, as at Fushimi Inari), stone lanterns (tōrō), komainu guardian lion-dogs, temizuya water basin, ema wish plaques, shimenawa rope with zig-zag paper (shide) on sacred trees and rocks, and a five-storey pagoda.
- Villages: thatched minka farmhouses with deep eaves, white storehouses (kura), red arched bridge (taiko-bashi), rice paddies, watermill, paper lanterns (chōchin), noren door curtains, scarecrow.
- Roadside: jizō statues in red bibs and caps (protectors of travellers), wooden signposts.
- War camps: curtain walls (jinmaku) with a crest, tall nobori banners, commander's headquarters (honjin).
- Castles: sloping stone walls (ishigaki), moat, gate with a turret (yagura) above, white multi-storey keep (tenshu) with tiled roofs and gold fish-tiger roof ornaments (shachihoko).

## The new map (420 m x 420 m = 5.4x today's 180 m)
Walking across takes about 85 s, or 47 s running. The stream, landmarks and areas spread out using the existing `world.k` scale (420/120 = 3.5).

| Area (Japanese name on signs/map) | Where | Holds | Season while it's the current area |
|---|---|---|---|
| Shrine hill 神社 (start, safe) | centre | nobody: torii, pagoda, sacred cedar | — |
| 1. Bamboo grove 竹林 | south-west | Ronin bandits at a ruined temple gate | Spring (cherry petals) |
| 2. Cedar forest 杉の森 | west / north-west | Ashigaru camp (the current camp reworked) | Summer (rain) |
| 3. Village 村 | east, along the stream | Samurai garrison in a walled house compound | Autumn |
| 4. Maple valley 紅葉谷 | north-east | Hatamoto, then the **Daimyo** at his curtained HQ | Autumn |
| 5. Castle 城 | north, on a hill | Hatamoto guards, then the **Shogun** in the castle courtyard | Winter (snow) |
- Each area: 3 waves of its rank, with lower ranks mixed in as support, e.g. ashigaru archers and gunners with the samurai. Then a leader: a "captain" elite for areas 1–3, the Daimyo, the Shogun. When the leader falls, that area goes quiet and shows "竹林 制圧 / Bamboo grove cleared". The next camp gets a light beam and a glowing minimap marker.
- Weather (rain, clear, storm, dusk) still varies within the season. Winter has snow instead of rain.
- VS mode: picks a random area and spawns the brothers there.

## Build steps (each one is a tested save point: commit + PROGRESS.md update)

### A. Big-world foundations (nothing looks different yet)
- `config.js`: `world.size` 180 → 420. Add `world.areas` (centre, radius, rank, season) and scale the counts. Add a `LOW_GRAPHICS` cut for plants.
- `world.js`:
  - Split the ground into 60 m tiles (7x7) so off-screen tiles aren't drawn.
  - Change `Batch` to bucket instances by tile, with real bounding spheres and `frustumCulled` on. Grow the spheres by tree height so falling trees stay visible (`trees.js` `place()` keeps working through `trunkMesh`/`crownMesh` and needs a tile index per tree).
- **Obstacle grid:** a 10 m cell hash over `world.obstacles`. `resolveCollision`, samurai `steer`/`routeVia` and bullet/arrow hit checks query nearby cells only. Thousands of trees and bamboo would be too slow with today's full-list scan.
- New `src/areas.js`: area layout, `areaAt(x,z)`, and blend weights that say which forest type grows where.
- `minimap.js`: a zoomed local view (~90 m around you) plus a full-map overlay (M key / controller Back) with the areas' kanji names and cleared marks.
- Check: the sun's shadow box and the rain box follow the players, and the camera far plane (300) and fog are fine.
- **Test:** 60 fps in the preview at 1x and `?low`, no console errors, rerun the 16-obstacle steering test.

### B. Japanese forest (new `src/flora.js`; `world.js` calls it per area)
- **B1:** Sugi and hinoki replace the giant rainforest trees: tall cone crowns of layered tufts and red-brown ridged bark. Samurai/rope drop spots move to their lower branches (`canopySpots`). Akamatsu red pines go on ridges and around the shrine and castle. Broken trees become storm-snapped dead cedars, so the falling-tree mechanic is unchanged. Moss-covered boulders and logs.
- **B2:** Bamboo groves replace the palms: dense clumps of tall segmented stalks that sway and creak. Light leaf-litter ground.
- **B3:** Momiji maples and sakura near the shrine, village and valley. Sasa bamboo grass replaces the big-leaf plants and the ferns stay. Area-tinted ground: dark needles and moss, village dirt paths, castle gravel. A giant ancient cedar wrapped in shimenawa on shrine hill.
- Leaf colours are instance colours, so step F can recolour them per season.

### C. Japanese places (`landmarks.js` reworked; new `src/jptext.js`)
- **`jptext.js`:** canvas textures with Japanese text, using the fonts already on the computer (Hiragino on Mac, Yu Mincho/Meiryo on Windows: no download). Also a `bilingual(jp, en)` helper for HUD toasts and banners, e.g. 第一波 / Wave 1 and 危険 / Danger on the falling-tree warning.
- **C1:** Shrine hill replaces the temple ruins: stone steps, a tunnel of vermilion torii (a hideout), haiden hall with a curved roof, komainu, tōrō lanterns, temizuya, ema board. The five-storey pagoda replaces the plane wreck and has a hideout ring.
- **C2:** The collapsed stilt huts become collapsed thatched minka (still hideouts). Treehouses become lookout towers (monomi-yagura) with the same climb code in `treehouses.js`, and there are about 15 of them. Stone paths between areas with lanterns, jizō in red bibs, and kanji signposts pointing to each area.
- **C3:** Village: minka, white kura storehouse, red taiko-bashi bridge over the stream, rice paddies (shallow water reusing the wading/foam code), watermill, chōchin lanterns, noren, scarecrow.
- **C4:** Castle: moat, sloping ishigaki walls, a gate with a turret, a courtyard (the Shogun arena), and a white three-tier keep with tiled roofs and gold shachihoko. The keep can't be entered.

### D. The 6 warrior ranks (`samurai.js`, `config.js`)
- **D1:** Replace `samurai.kinds`/`mix` with `config.ranks` (health, speed, damage, weapon, look per rank) and refactor `buildSamurai` into shared armour parts plus a per-rank look. Remove the nunchuck kind, `ronin.js` and `boss.js`. Move the dash-streak, block/dodge and ground-slam code into a shared `src/bossmoves.js` first so it isn't lost.
- **D2:** Ronin (kasa hat, kimono, one sword, fast side-steps). Ashigaru: yari thrust; yumi, which is the current archer; teppō gunner with an aim line, a bang with a smoke puff (pixel-texture smoke from `pixeltex.js`) and a 3 s reload.
- **D3:** Hatamoto: black-and-gold armour, tall sashimono, naginata sweeps, some blocking.
- **D4:** Daimyo boss (`src/daimyo.js`): jinbaori with crest, big gilded crest, gunbai. Arrow-volley red zones, calls hatamoto, heavy slam.
- **D5:** Shogun final boss (`src/shogun.js`): 3 phases as in the research table, plus a boss health bar with a kanji name.
- Each new rank gets a first-time toast (bilingual), a minimap colour and its own sounds in `sound.js` (teppō bang, naginata swoosh, war drum, conch-shell horn when a wave starts).

### E. Area campaign (`outpost.js` → `src/camps.js`, `combat.js`)
- Generalise `buildOutpost` into one camp builder per style: ronin temple-gate hideout, ashigaru bamboo-palisade camp, samurai walled compound, Daimyo's curtained honjin, castle courtyard. Each has territory posts, a gate route (`routeVia`) and guards, reusing today's code.
- `combat.js`: "level" becomes the current area. 3 waves, then the leader; the quiet countdown runs only in that area's territory. Next-camp beam and minimap glow, area-cleared banner, victory screen after the Shogun, then Round 2 (+40% toughness, all camps refill).

### F. Seasons (new `src/seasons.js`, `sky.js`, `weather.js`)
- Palette per season: maple and sakura leaf colours, ground tint, snow-white cover in winter.
- Particles reuse the `Rain` box: falling cherry petals in spring, red maple leaves in autumn, snow in winter.
- The season changes when an area is cleared (with a short banner, e.g. 秋 / Autumn).

### G. Title and finish
- Kanji title on the menu and the browser tab, using the name the kids pick, plus updates to PROGRESS.md and the memory notes.

## Files touched (main)
`src/config.js`, `src/world.js`, `src/trees.js`, `src/landmarks.js`, `src/outpost.js` → `src/camps.js`, `src/samurai.js`, `src/combat.js`, `src/minimap.js`, `src/treehouses.js`, `src/sky.js`, `src/weather.js`, `src/sound.js`, `src/hud.js`, `index.html`. New: `src/areas.js`, `src/flora.js`, `src/jptext.js`, `src/bossmoves.js`, `src/daimyo.js`, `src/shogun.js`, `src/seasons.js`. Removed: `src/ronin.js`, `src/boss.js`.

## Verification (every step)
- `preview_start` with the project's launch config (tools/serve.py, port 8080), then check `read_console_messages` for errors.
- Add a debug helper `game.goTo('castle')` to teleport, and screenshot each area overhead and in first person. If the pane is hidden, render via `game.renderer.domElement.toDataURL()` (tip in PROGRESS.md).
- Frame rate: time `game.step` plus a render over 300 frames in each area, at normal and `?low`. Target 60 fps in the pane. Watch `renderer.info.render.calls/triangles`.
- Gameplay by stepping (`game.paused = true; game.step(1/60)`):
  - each rank attacks and can be beaten
  - waves start only inside the territory
  - leaders appear, and the area-cleared flow, season change, Shogun victory and Round 2 all work
  - co-op revive and VS still work
- Never tested by a person: real controllers, sounds by ear. Note these for the kids' playtest.

## Risks
- Performance on the kids' computer: chunking and the obstacle grid come first (step A) for this reason, and `?low` thins the plants.
- If the kids' computer lacks Japanese fonts (rare), text shows as boxes. Fix would be the Noto Serif JP web font; ask before downloading.
- The Safari/Brave canvas noise only matters on see-through textures. Kanji signs are solid, so they're fine.
