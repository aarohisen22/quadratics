// Overhead camera that follows the ninjas and zooms out as they spread apart.
import * as THREE from 'three';

export class CameraRig {
  constructor(camera, cfg) {
    this.camera = camera;
    this.cfg = cfg;
    this.focus = new THREE.Vector3();
    this.lookAt = new THREE.Vector3();
    this.first = true;
    this.shake = 0;
  }

  update(dt, targets) {
    const center = new THREE.Vector3();
    targets.forEach(t => center.add(t));
    center.divideScalar(targets.length);
    let spread = 0;
    for (const t of targets) spread = Math.max(spread, t.distanceTo(center));

    const zoom = 1 + (spread * this.cfg.zoomOutPerMeter) / this.cfg.height;
    const want = new THREE.Vector3(center.x, center.y + this.cfg.height * zoom, center.z + this.cfg.distance * zoom);

    if (this.first) { this.camera.position.copy(want); this.lookAt.copy(center); this.first = false; }
    const k = 1 - Math.exp(-5 * dt);
    this.camera.position.lerp(want, k);
    this.lookAt.lerp(center, k);
    this.camera.lookAt(this.lookAt.x, this.lookAt.y + 1, this.lookAt.z);
    if (this.shake > 0) {   // big crashes shake the camera
      this.shake = Math.max(0, this.shake - dt * 1.5);
      const k = this.shake * this.shake * 0.6;
      this.camera.position.x += (Math.random() - 0.5) * k;
      this.camera.position.y += (Math.random() - 0.5) * k;
    }
    this.focus.copy(this.lookAt);
  }
}
