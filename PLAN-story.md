# Quadratics: opening screen, story, voices and NPCs

Done already: the game is called **Quadratics** and the players are **Anay** (red headband, player 1) and **Arha** (blue headband, player 2). The names live in `src/config.js` (`GAME_NAME`, `PLAYER_NAMES`).

The story follows the map we already have. You start at shrine hill, then go through the bamboo grove (ronin), cedar forest (ashigaru), village (samurai), maple valley (hatamoto and the Daimyo), and finally the castle (the Shogun). Each area becomes one chapter. This fits the planned step E (a camp per area), so step E becomes part of this plan.

## Step S1: Opening screen
- A title scene: the camera drifts slowly past shrine hill at dusk while lanterns light up. "QUADRATICS" fades in in big brush-style letters, with a small Japanese subtitle.
- Anay and Arha stand on the torii steps in idle poses: headbands blowing, one spinning a shuriken.
- Menu: **Story**, **Free play** (today's endless waves), **2 Player VS**, **First-Person**, **Settings**, **How to play**.
  - Story and Free play each let you pick 1 or 2 players.
- Settings: volume (music, effects, voices), mouse sensitivity, low graphics, subtitles on/off.
- The game remembers your settings and your furthest story chapter (saved in the browser).
- Plays fine with a controller, a keyboard or a mouse.

## Step S2: Story and cutscenes
- **Intro cutscene** (about 30–45 s, skippable): drawn-style panels or in-game camera shots with captions and narration. It sets up why Anay and Arha are fighting the Shogun. The premise is your choice (options below).
- **Chapters**: one per area, so 5 in all.
  - Each chapter starts with a short scene: an NPC tells you what's wrong there.
  - Then you clear the camp. Its leader is a mini-boss.
  - A short ending scene unlocks the next area.
  - A glowing marker points to where you go next.
- **Final chapter**: the castle and the Shogun, an ending cutscene, credits listing the kids as designers, then "Round 2" (harder).
- Story text lives in one file, `src/story.js`. The kids can rewrite any line without touching code.

## Step S3: Dialogue system
- Speech bubbles over a character's head during play: short lines like "Arha, behind you!", "Out of shurikens!", "Nice one!"
- A dialogue box at the bottom for conversations: portrait, name, text typed out letter by letter. A or Enter goes to the next line.
- Characters react to things that happen in the game, for example:
  - low health
  - picking up the katana
  - reviving each other
  - a boss appearing
  - a long quiet spell (joking around)
  - winning a VS round (teasing each other)
- Lines are picked at random from a list so they don't repeat too often.
- Subtitles always show, so the game still makes sense with the sound off.

## Step S4: Voices
Every line has an id (e.g. `anay_revive_1`). If there's a sound file for that id, the game plays it. If not, it shows the text only (or reads it with the computer voice, if that option is chosen). So we can add voices a few at a time.

Ways to get voices (choose below):
1. **The kids record their own voices** (recommended: Anay and Arha voicing themselves is the most fun). I'd build a small recording page, `record.html`. It shows each line, you press record, play it back, re-record if needed, and it saves into the game. Grown-ups or friends can voice the NPCs and the Shogun.
2. **Computer voice** (the browser's built-in text-to-speech): free and instant, but robotic. Good as a stand-in until recordings exist.
3. **AI voices** from a voice service: very good quality, but it needs an account and maybe a paid plan. I'd only do this if you set up the account.

## Step S5: NPCs (friendly characters)
Ideas. Pick the ones you like and the kids can add more:
- **Old shrine keeper (Kannushi)**, at shrine hill: gives the story missions and heals you when you visit. The hub character.
- **Village blacksmith**: upgrades weapons (a faster Uzi, more shurikens) using coins dropped by samurai.
- **Farmers and villagers**: hide when samurai come, cheer and thank you after you free their area. Some give side quests ("find my lost goat in the bamboo").
- **Tea house owner**: refills health. Shares rumours about the boss of each area.
- **A traveling merchant** who shows up in a different area each chapter.
- **A captured ally** (say, a ninja teacher) whom you rescue from the castle near the end.
- **Animals**: the shrine fox (kitsune) shows the way to the next area. There are also deer, cranes and a cat that follows you around the village.

NPCs never get hurt by your shots: bullets pass through them. Samurai ignore them.

## Order and save points
S1 opening screen → S2 story + chapters (includes the old step E) → S3 dialogue → S5 NPCs → S4 voices (recordings can come in over time). I'll commit and push after each step, so the live link updates every time. Seasons (old step F) can come after.

## Decisions (2026-11-26)
- Anay and Arha are **two brothers** ("the brothers" stays).
- Story: **the stolen shrine treasure**. The Shogun steals the shrine's sacred Quadratic Stone, which keeps the forest alive. The brothers win back its 4 pieces, one from each area leader (bamboo grove, cedar forest, village, maple valley/Daimyo), then storm the castle to face the Shogun.
- Voices: **the kids record them** with a record page. The computer voice stands in for any line that isn't recorded yet.
- NPCs going in first: shrine keeper, villagers and farmers, blacksmith and tea house, animals and the fox guide.
