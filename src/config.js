// ============================================================
//  GAME SETTINGS: change these numbers to tune the game.
//  Save the file and refresh the browser to see the change.
// ============================================================

// Add ?low to the address (http://localhost:8080/?low) for slower computers.
export const LOW_GRAPHICS = new URLSearchParams(location.search).has('low');

export const CONFIG = {
  world: {
    seed: 7,              // change for a different jungle layout
    size: 180,            // jungle width and depth in meters (landmarks are placed for 180; was 120)
    giantTrees: 190,
    palmTrees: 125,
    brokenTrees: 44,      // dead leaning trees that can fall on you
    fallenLogs: 32,
    rocks: 100,
    ferns: LOW_GRAPHICS ? 380 : 800,
    bigLeafPlants: LOW_GRAPHICS ? 120 : 300,
    puddles: 80,
    // The samurai camp. Waves march out of it; past the red-ribboned posts (territory meters
    // from the camp) no more samurai come, so you can explore.
    outpost: { x: -10, z: -48, territory: 58, wall: 15, fireDamage: 25 },   // fireDamage: health per second standing in the campfire
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
      // Nunchuck fighters only: a quick spin, then 3 fast hits.
      combo: { chance: 0, windup: 0.22, damage: 0.35, range: 1.8, arc: 0.2, recover: 0.5, hits: 3, interval: 0.14 },
    },
    // Kinds of samurai: health and speed compared with a sword samurai.
    kinds: {
      sword:    { health: 1,    speed: 1 },
      archer:   { health: 0.8,  speed: 0.95 },
      nunchuck: { health: 0.85, speed: 1.3 },
    },
    // Archers keep their distance, draw (a red line shows where the arrow will go), then shoot.
    archer: { keepAway: 7, shootRange: 15, drawSeconds: 0.9, reloadSeconds: 1.6, damage: 0.8, arrowSpeed: 16 },
    // How many of each wave are archers / nunchuck fighters: 20% from their first level, +3% a level, at most 35% each.
    mix: { archerFromLevel: 3, nunchuckFromLevel: 4, startShare: 0.2, sharePerLevel: 0.03, maxShare: 0.35 },
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

  // Bosses: the Twin-blade Ronin after levels 3, 8, 13... and the Oni Warlord after 5, 10, 15...
  ronin: {
    health: 650, healthPerAppearance: 0.5,
    damage: 14, damagePerAppearance: 0.25,
    speed: 4.2, attackRange: 2.0,
    attacks: {
      jab:   { chance: 0.45, windup: 0.25, damage: 0.8, range: 2.3, arc: 0.8, recover: 0.3 },
      slash: { chance: 0.55, windup: 0.4, damage: 1.0, range: 2.3, arc: -0.1, recover: 0.45 },   // both swords sweep across
      // The dash: from 5-13 m away a red streak shows his path, then he dashes through it. Step aside!
      dash:  { chance: 0, windup: 0.7, damage: 1.6, range: 0, arc: 1, recover: 0.8, dash: true,
               minRange: 5, maxRange: 13, speed: 22, cooldown: 3.5 },
    },
    // He's a master swordsman: when he isn't busy attacking he blocks and dodges.
    // Hit him while he winds up an attack (or crouches for a dash): then he can't defend.
    defense: {
      blockChance: 0.6,      // bullets / pellets he knocks away with his swords when he's facing you
      blockArcDegrees: 150,  // how wide in front of him he can block
      shurikenBlock: 0.5,    // chance he swats a shuriken out of the air
      katanaParry: 0.35,     // chance he parries your katana (then strikes back fast)
      dodgeChance: 0.35,     // chance a hit makes him leap aside instead
      dodgeCooldown: 1.6,    // seconds between dodges
      dodgeDistance: 3.4,
      dodgeSeconds: 0.3,
    },
  },

  // The Oni Warlord mini boss: comes after every 5th level (5, 10, 15...).
  boss: {
    every: 5,
    roninAt: 3,                               // the Ronin comes when level % every == roninAt (3, 8, 13...)
    health: 800, healthPerAppearance: 0.5,   // +50% health each time he comes back
    damage: 20, damagePerAppearance: 0.25,
    speed: 2.3, attackRange: 3.0,
    summon: 2,                                // samurai he calls in when he's down to half health
    attacks: {
      slash: { chance: 0.6, windup: 0.7, damage: 1.0, range: 3.4, arc: -0.1, recover: 0.8 },               // wide club swing
      chop:  { chance: 0.4, windup: 1.2, damage: 1.6, range: 3.5, arc: -1, recover: 1.2, slam: true, radius: 4 }, // ground slam (red ring)
    },
  },

  levels: {
    startSamurai: 5,      // samurai in each wave on level 1
    extraPerLevel: 2,     // more samurai per wave each level
    wavesPerLevel: 2,     // each level comes in waves...
    extraWaveFromLevel: 5, // ...and from this level on, one more wave
    waveSizeFactor: 0.75, // waves are a bit smaller than a whole level used to be
    extraPerWave: 2,      // each wave in a level brings this many more samurai than the one before
    toughnessPerLevel: 0.15, // +15% health and damage each level
    refillAmmoOnLevelUp: false, // supply crates bring ammo now
    // Quiet time: after you beat a wave, nothing comes for a while (a countdown shows how long).
    firstQuietSeconds: 15,  // before the very first wave
    quietSeconds: [20, 20], // between waves (a random time in this range)
    // The countdown only runs while someone is inside samurai territory.
    fromCamp: 0.6,          // share of each wave that marches out of the camp gate (the rest slide down vines)
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
