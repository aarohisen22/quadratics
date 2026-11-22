// ============================================================
//  GAME SETTINGS: change these numbers to tune the game.
//  Save the file and refresh the browser to see the change.
// ============================================================

// Add ?low to the address (http://localhost:8080/?low) for slower computers.
export const LOW_GRAPHICS = new URLSearchParams(location.search).has('low');

export const CONFIG = {
  world: {
    seed: 7,              // change for a different jungle layout
    size: 420,            // map width and depth in meters (was 180: now 5.4x the area). Areas are in areas.js
    trees: 1150,          // cedars, cypress, red pines, maples, cherries (which kind depends on the area: flora.js)
    bambooClumps: LOW_GRAPHICS ? 420 : 650,
    spraysPerStalk: LOW_GRAPHICS ? 3 : 5,
    brokenTrees: 210,     // dead snapped cedars that can fall on you
    fallenLogs: 170,
    rocks: 520,
    ferns: LOW_GRAPHICS ? 1800 : 4200,
    sasa: LOW_GRAPHICS ? 900 : 2200,   // clumps of bamboo grass
    puddles: 400,
    lookouts: 15,         // treehouses / lookout towers you can climb
    // The samurai camp. Waves march out of it; past the red-ribboned posts (territory meters
    // from the camp) no more samurai come, so you can explore.
    outpost: { x: -130, z: -55, territory: 195, wall: 15, fireDamage: 25 },   // in the cedar forest (areas.js). territory 195 m reaches shrine hill, the pagoda, the minka huts and the castle; the village and maple valley stay calm. fireDamage: health per second in the campfire
  },

  weather: {
    rainDrops: LOW_GRAPHICS ? 3000 : 9000,
    rainSpeed: 38,        // how fast the rain falls
    wind: 4,              // how slanted the rain is
    fogDensity: 0.024,    // higher = thicker mist
    rainVolume: 0.5,      // 0 = silent, 1 = loud
  },

  player: {
    walkSpeed: 5,
    runSpeed: 9,
    jumpSpeed: 7,
    gravity: 22,
    health: 100,
  },

  weapons: {
    uziAmmo: 100,         // bullets you start with
    gatlingWalk: 0.7,     // you walk at 70% speed carrying the heavy gatling gun
    uziDamage: 10,        // per bullet
    uziShotsPerSecond: 11,
    uziRange: 28,         // meters
    shurikens: 5,         // shurikens in your pockets
    shurikenDamage: 35,
    shurikenSpeed: 24,
    aimHelpDegrees: 12,   // bullets bend toward a samurai this close to your aim (0 = off)
  },

  drops: {
    everySeconds: 30,     // a supply crate falls from the sky this often
    firstDropSeconds: 10, // the first one comes sooner
    healthChance: 0.22,   // chance a crate is a health crate (white with a red cross)
    healthAmount: 40,     // health a health crate gives back
    specialChance: 0.35,  // chance a crate holds a special weapon instead of ammo
    ammoBullets: 80,      // Uzi bullets in an ammo crate
    ammoShurikens: 2,     // shurikens in an ammo crate
    maxUziAmmo: 250,      // most bullets you can carry
    maxShurikens: 8,
    maxCratesOnMap: 4,
  },

  specials: {
    shotgun: { shells: 8, pellets: 7, damagePerPellet: 12, spreadDegrees: 24, range: 14, shotsPerSecond: 1.5 },
    // The katana never breaks: once you find it, it stays on your back for the rest of the game.
    // Pressing fire again quickly goes through a combo: slash right-to-left, backhand, overhead chop, thrust.
    katana:  { damage: 26, reach: 2.4, arcDegrees: 100, swingsPerSecond: 1.8, maxHitsPerSwing: 2, comboResetSeconds: 0.9,
               moves: [
                 { name: 'slash',    damage: 1,    reach: 1,    arc: 1,   hits: 2 },
                 { name: 'backhand', damage: 1,    reach: 1,    arc: 1,   hits: 2 },
                 { name: 'overhead', damage: 1.2,  reach: 1.05, arc: 0.6, hits: 1 },
                 { name: 'thrust',   damage: 1.3,  reach: 1.25, arc: 0.4, hits: 1 },
               ] },
    smoke:   { bombs: 3, radius: 5, seconds: 5, throwDistance: 7 }, // samurai can't see you in the smoke
    // Barrels spin up for spinUpSeconds while you hold fire, then it shoots very fast (walk speed: weapons.gatlingWalk).
    gatling: { rounds: 150, spinUpSeconds: 0.5, shotsPerSecond: 22, damage: 9, range: 30, spreadDegrees: 5 },
    // How often each special comes in a special crate (the gatling is rarer).
    weights: { shotgun: 1, katana: 1, smoke: 1, gatling: 0.5 },
  },

  hazards: {
    treeFallEverySeconds: [10, 20], // a broken tree near you falls every 10-20 seconds
    warningSeconds: 2.2,  // creaking + red zone before it falls: time to get out of the way
    treeDamage: 40,       // to ninjas; samurai get double
    shotsToTopple: 14,    // shoot a broken tree this many times to knock it over on purpose!
  },

  samurai: {
    health: 40,
    damage: 12,           // per katana hit
    speed: 2.8,           // ninjas walk at 5, so samurai are a bit slower
    attackRange: 1.8,
    windupSeconds: 0.45,  // (old single attack; now each attack below has its own warning time)
    // Each time he attacks he picks one of these. damage = times the samurai's damage (12 at level 1).
    // windup = warning time before the hit, arc = how wide it hits (1 = only dead ahead, -0.2 = very wide).
    attacks: {
      jab:   { chance: 0.35, windup: 0.28, damage: 0.6, range: 2.3, arc: 0.85, recover: 0.35 }, // fast poke: step aside
      slash: { chance: 0.40, windup: 0.45, damage: 1.0, range: 2.0, arc: -0.2, recover: 0.55 }, // wide sweep from the side: back off
      chop:  { chance: 0.25, windup: 0.80, damage: 1.8, range: 1.9, arc: 0.35, recover: 0.85 }, // big overhead: long warning, hurts most
    },
    // The six ranks (the Daimyo and Shogun are bosses, set below). Health, speed and damage are
    // times a plain samurai's. weapon: which set of attacks below they use.
    ranks: {
      ronin:    { jp: '浪人', en: 'Ronin',              health: 0.8, speed: 1.25, damage: 0.9, weapon: 'katana', quick: 0.85, dodge: 0.3 },
      yari:     { jp: '足軽', en: 'Ashigaru spearman',  health: 0.6, speed: 0.95, damage: 0.8, weapon: 'yari' },
      yumi:     { jp: '弓足軽', en: 'Ashigaru archer',  health: 0.55, speed: 0.95, damage: 0.8, weapon: 'bow' },
      teppo:    { jp: '鉄砲足軽', en: 'Ashigaru gunner', health: 0.55, speed: 0.9, damage: 1.0, weapon: 'gun' },
      samurai:  { jp: '侍', en: 'Samurai',              health: 1,   speed: 1,    damage: 1,   weapon: 'katana' },
      hatamoto: { jp: '旗本', en: 'Hatamoto',           health: 2.5, speed: 0.95, damage: 1.3, weapon: 'naginata', block: 0.3 },
    },
    // Attacks for each weapon (same three moves: jab, slash, chop; numbers as in `attacks` above).
    weaponAttacks: {
      yari: {      // spear: a long straight thrust, or a wide sweep with the shaft
        jab:   { chance: 0.65, windup: 0.5, damage: 1.0, range: 3.3, arc: 0.88, recover: 0.5 },
        slash: { chance: 0.35, windup: 0.55, damage: 0.7, range: 2.8, arc: -0.1, recover: 0.6 },
      },
      naginata: {  // long curved blade: huge sweeps and a heavy overhead chop
        slash: { chance: 0.6, windup: 0.55, damage: 1.0, range: 3.0, arc: -0.35, recover: 0.6 },
        chop:  { chance: 0.4, windup: 0.85, damage: 1.7, range: 3.1, arc: 0.3, recover: 0.9 },
      },
    },
    // Archers keep their distance, draw (a red line shows where the arrow will go), then shoot.
    archer: { keepAway: 7, shootRange: 15, drawSeconds: 0.9, reloadSeconds: 1.6, damage: 0.8, arrowSpeed: 16 },
    // Gunners aim for longer (red line, his aim locks for the last lockSeconds), then BANG: the shot is instant,
    // so get off the line before it locks. Then a long reload.
    gunner: { keepAway: 9, shootRange: 19, aimSeconds: 1.5, lockSeconds: 0.45, reloadSeconds: 3.2, damage: 1.8 },
    // Which ranks come in each level (shares). Level 6 starts again from the top, tougher.
    // (Step E of the Japan makeover ties these to the map's areas instead.)
    rankMix: [
      { ronin: 1 },
      { yari: 0.5, yumi: 0.3, teppo: 0.2 },
      { samurai: 0.6, yumi: 0.2, teppo: 0.2 },
      { hatamoto: 0.4, samurai: 0.4, teppo: 0.2 },
      { hatamoto: 0.6, samurai: 0.2, yari: 0.2 },
    ],
  },

  hiding: {
    revealSeconds: 4,     // after firing a gun, samurai can see you this long even in a hideout or smoke
  },

  versus: {
    killsToWin: 5,        // first brother to this many knock-downs wins
    respawnSeconds: 3,
    spawnApart: 20,       // how far apart the brothers start (meters)
  },

  coop: {
    reviveSeconds: 2.5,   // stand next to your downed brother this long to revive him
    reviveDistance: 2,    // how close you need to be (meters)
    reviveHealth: 0.4,    // he comes back with 40% health
    maxApart: 24,         // brothers can't get further apart than this (keeps both on screen)
    reviveOnNewLevel: 0.5, // a downed brother comes back with 50% health when a level starts
  },

  // Bosses: the Daimyo (a lord) after level 4 and the Shogun (the supreme ruler) after level 5;
  // then the ranks start again, tougher, with the bosses after levels 9 and 10, and so on.
  bosses: { every: 5, daimyoAfter: 4, shogunAfter: 5, toughnessPerRound: 0.4 },

  // The Daimyo: jinbaori surcoat, big gold crest, war fan. Waves his fan to call arrow volleys
  // (red circles on the ground: get out!), slams the ground with his great sword, calls hatamoto at half health.
  daimyo: {
    health: 1100, damage: 20, speed: 2.6, attackRange: 2.6, summon: 2,
    attacks: {
      slash: { chance: 0.55, windup: 0.6, damage: 1.0, range: 3.0, arc: -0.1, recover: 0.7 },
      chop:  { chance: 0.45, windup: 1.1, damage: 1.5, range: 3.2, arc: -1, recover: 1.1, slam: true, radius: 3.8 },
      volley: { windup: 1.0, cooldown: 7, circles: 4, radius: 2.4, delay: 1.3, damage: 0.9 },
    },
  },

  // The Shogun, final boss. Phase 1: sword duel, blocks and leaps aside. Phase 2 (below 2/3 health):
  // also dashes (red streak) and calls gunners (they kneel at the side and aim red beams along red lanes, then a volley).
  // Phase 3 (below 1/3): enraged: faster and quicker to strike.
  shogun: {
    health: 1600, damage: 18, speed: 3.6, attackRange: 2.3,
    attacks: {
      jab:   { chance: 0.4, windup: 0.3, damage: 0.8, range: 2.6, arc: 0.8, recover: 0.35 },
      slash: { chance: 0.4, windup: 0.45, damage: 1.0, range: 2.8, arc: -0.15, recover: 0.5 },
      chop:  { chance: 0.2, windup: 0.75, damage: 1.6, range: 2.7, arc: 0.3, recover: 0.8 },
      dash:  { chance: 0, windup: 0.75, damage: 1.5, range: 0, arc: 1, recover: 0.8, dash: true,
               minRange: 5, maxRange: 14, speed: 22, cooldown: 4 },
      lanes: { windup: 2.0, cooldown: 9, count: 3, width: 2.2, length: 26, damage: 1.4 },
    },
    defense: {
      blockChance: 0.5, blockArcDegrees: 150, shurikenBlock: 0.4, katanaParry: 0.3,
      dodgeChance: 0.3, dodgeCooldown: 1.8, dodgeDistance: 3.4, dodgeSeconds: 0.3,
    },
    enraged: { speed: 1.3, windup: 0.75 },
  },

  levels: {
    startSamurai: 5,      // samurai in each wave on level 1
    extraPerLevel: 2,     // more samurai per wave each level
    wavesPerLevel: 2,     // each level comes in waves...
    extraWaveFromLevel: 5, // ...and from this level on, one more wave
    waveSizeFactor: 0.75, // waves are a bit smaller than a whole level used to be
    extraPerWave: 2,      // each wave in a level brings this many more samurai than the one before
    // Guards posted inside the camp: they attack anyone near or inside it but don't chase far,
    // and they don't count toward beating a wave. Fallen guards are replaced each new level.
    guards: 4, guardsPerLevel: 1, maxGuards: 12, guardRange: 12,   // guardRange: meters outside the wall they'll come after you
    toughnessPerLevel: 0.15, // +15% health and damage each level
    refillAmmoOnLevelUp: false, // supply crates bring ammo now
    // Quiet time: after you beat a wave, nothing comes for a while (a countdown shows how long).
    firstQuietSeconds: 15,  // before the very first wave
    quietSeconds: [20, 20], // between waves (a random time in this range)
    // The countdown only runs while someone is inside samurai territory.
    fromCamp: 0.6,          // share of each wave that marches out of the camp gate (the rest slide down vines)
    marchRange: 60,         // ...but only when someone is this close to the camp; further away they all come down vines near you
    leashExtra: 8,          // samurai give up chasing you this far past the territory posts and go back to camp
  },

  fps: {
    mouseSensitivity: 0.0022, // how fast the mouse turns your view
    stickLookSpeed: 2.8,  // how fast the right stick turns your view
    fieldOfView: 72,
    aimHelpDegrees: 4,    // less aim help than overhead: you aim with the crosshair
  },

  camera: {
    height: 10.5,         // how high above the ninjas (lower = bigger ninjas)
    distance: 7.5,        // how far behind
    zoomOutPerMeter: 0.5, // zooms out as the brothers move apart (Phase 3)
  },
};
