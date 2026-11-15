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
    brokenTrees: 14,      // the ones that may fall on you (Phase 4)
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

  samurai: {
    health: 40,
    damage: 12,           // per katana hit
    speed: 3.4,
    attackRange: 1.8,
    windupSeconds: 0.45,  // how long he raises his sword before striking (time to dodge!)
  },

  levels: {
    startSamurai: 5,      // samurai on level 1
    extraPerLevel: 2,     // more samurai each level
    toughnessPerLevel: 0.15, // +15% health and damage each level
    refillAmmoOnLevelUp: true, // until weapon drops arrive in Phase 4
  },

  camera: {
    height: 15,           // how high above the ninjas
    distance: 10,         // how far behind
    zoomOutPerMeter: 0.5, // zooms out as the brothers move apart (Phase 3)
  },
};
