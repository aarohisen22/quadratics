// ============================================================
//  GAME SETTINGS: change these numbers to tune the game.
//  Save the file and refresh the browser to see the change.
// ============================================================

// Add ?low to the address (http://localhost:8080/?low) for slower computers.
export const LOW_GRAPHICS = new URLSearchParams(location.search).has('low');

export const CONFIG = {
  world: {
    seed: 7,              // change for a different jungle layout
    size: 120,            // jungle width and depth in meters
    giantTrees: 90,
    palmTrees: 60,
    brokenTrees: 24,      // dead leaning trees that can fall on you
    fallenLogs: 16,
    rocks: 50,
    ferns: LOW_GRAPHICS ? 180 : 380,
    bigLeafPlants: LOW_GRAPHICS ? 60 : 140,
    puddles: 40,
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
    uziAmmo: 60,          // bullets you start with
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
    specialChance: 0.35,  // chance a crate holds a special weapon instead of ammo
    ammoBullets: 60,      // Uzi bullets in an ammo crate
    ammoShurikens: 2,     // shurikens in an ammo crate
    maxUziAmmo: 180,      // most bullets you can carry
    maxShurikens: 8,
    maxCratesOnMap: 4,
  },

  specials: {
    shotgun: { shells: 8, pellets: 7, damagePerPellet: 12, spreadDegrees: 24, range: 14, shotsPerSecond: 1.5 },
    katana:  { swings: 15, damage: 30, reach: 2.4, arcDegrees: 100, swingsPerSecond: 1.8, maxHitsPerSwing: 2 },
    smoke:   { bombs: 3, radius: 5, seconds: 5, throwDistance: 7 }, // samurai can't see you in the smoke
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
    windupSeconds: 0.45,  // how long he raises his sword before striking (time to dodge!)
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

  levels: {
    startSamurai: 5,      // samurai in each wave on level 1
    extraPerLevel: 2,     // more samurai per wave each level
    wavesPerLevel: 2,     // each level comes in waves...
    extraWaveFromLevel: 5, // ...and from this level on, one more wave
    waveSizeFactor: 0.75, // waves are a bit smaller than a whole level used to be
    toughnessPerLevel: 0.15, // +15% health and damage each level
    refillAmmoOnLevelUp: false, // supply crates bring ammo now
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
