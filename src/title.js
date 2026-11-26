// The title scene behind the main menu: dusk on shrine hill. The camera drifts slowly around the
// brothers standing at the foot of the torii tunnel while the stone lanterns light up one by one.
import * as THREE from 'three';
import { lanternGlow } from './landmarks.js';

const SPOTS = [[-0.8, -4.3], [0.8, -4.6]];   // where the brothers stand (shrine hill is at 0, 0; the tunnel runs north)

export class TitleScene {
  constructor(camera, world, scene) {
    this.camera = camera;
    this.world = world;
    // A warm lantern glow on the brothers. It stays in the scene at zero brightness during play,
    // because adding and removing lights makes the browser rebuild every material (a stutter).
    this.light = new THREE.PointLight(0xffa860, 0, 9, 1.6);
    scene.add(this.light);
    this.target = new THREE.Vector3();
    this.t = 0;
  }

  // Put the brothers in place and start the slow camera move from the beginning.
  begin(players) {
    this.t = 0;
    players.forEach((p, i) => { p.reset(SPOTS[i][0], SPOTS[i][1]); p.facing = 0.15 - i * 0.3; });
    const y = this.world.heightAt(0, -5);
    this.target.set(0, y + 1.0, -6);
    this.light.position.set(-1.6, y + 2.2, -2.4);
    lanternGlow(0);
  }

  update(dt, players) {
    this.t += dt;
    const t = this.t;
    // Swing gently from one side to the other, rising and sinking a little; start close and low.
    const a = Math.sin(t * 0.06) * 0.55 + 0.25;
    const r = 7.5 + Math.sin(t * 0.045) * 1.2 + Math.max(0, 4 - t) * 0.6;
    const h = 2.2 + Math.sin(t * 0.08 + 1) * 1.0;
    const cx = this.target.x + Math.sin(a) * r, cz = this.target.z + 1.5 + Math.cos(a) * r;
    this.camera.position.set(cx, this.target.y + h, cz);
    // Look a little to the left of the brothers so they stand to the right of the menu.
    const shift = innerWidth > 700 ? 2.4 : 0;
    this.camera.lookAt(this.target.x - Math.cos(a) * shift, this.target.y + 0.6, this.target.z + 1.5 + Math.sin(a) * shift);
    // The lanterns come on over the first few seconds and then flicker softly.
    const on = Math.min(1, Math.max(0, (t - 0.8) / 2.5)), flicker = 1 + Math.sin(t * 7) * 0.05 + Math.sin(t * 13.3) * 0.03;
    lanternGlow(on * 1.9 * flicker);
    this.light.intensity = on * 7 * flicker;
    // The brothers turn a little toward the camera now and then.
    players.forEach((p, i) => {
      const want = Math.atan2(this.camera.position.x - p.pos.x, this.camera.position.z - p.pos.z) * 0.5 + (i ? -0.2 : 0.2);
      p.facing += (want - p.facing) * (1 - Math.exp(-1.5 * dt));
    });
  }

  // When a game starts, the play camera swoops down from wherever the title camera is.
  end(rig) {
    lanternGlow(1);
    this.light.intensity = 0;
    rig.lookAt.copy(this.target);
  }
}
