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
    katana:  { swings: 25, damage: 45, reach: 2.6, arcDegrees: 130, swingsPerSecond: 2.5 },
    smoke:   { bombs: 3, radius: 5, seconds: 7, throwDistance: 7 }, // samurai can't see you in the smoke
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
    speed: 3.4,
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
    startSamurai: 5,      // samurai on level 1
    extraPerLevel: 2,     // more samurai each level
    toughnessPerLevel: 0.15, // +15% health and damage each level
    refillAmmoOnLevelUp: false, // supply crates bring ammo now
  },

  camera: {
    height: 10.5,         // how high above the ninjas (lower = bigger ninjas)
    distance: 7.5,        // how far behind
    zoomOutPerMeter: 0.5, // zooms out as the brothers move apart (Phase 3)
  },
};
