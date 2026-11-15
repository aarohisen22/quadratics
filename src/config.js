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
  },

  camera: {
    height: 15,           // how high above the ninjas
    distance: 10,         // how far behind
    zoomOutPerMeter: 0.5, // zooms out as the brothers move apart (Phase 3)
  },
};
