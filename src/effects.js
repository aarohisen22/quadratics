// Visual effects: bullet tracers, muzzle flashes and sparks.
import * as THREE from 'three';

export class Effects {
  constructor(scene) {
    this.scene = scene;

    // Bullet tracers: short bright lines that fade fast.
    this.tracers = [];
    for (let i = 0; i < 40; i++) {
      const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({
        color: 0xffe2a0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      line.frustumCulled = false;
      line.userData.life = 0;
      scene.add(line);
      this.tracers.push(line);
    }
    this.nextTracer = 0;

    // Sparks and chips: one pool of particles with their own colors.
    this.max = 600;
    this.pPos = new Float32Array(this.max * 3).fill(-9999);
    this.pCol = new Float32Array(this.max * 3);
    this.pVel = new Float32Array(this.max * 3);
    this.pLife = new Float32Array(this.max);
    this.pStart = new Float32Array(this.max * 3);
    this.nextP = 0;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pPos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.pCol, 3));
    this.points = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.13, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    this.points.frustumCulled = false;
    scene.add(this.points);

    // Muzzle flashes: one light per brother, switched on for a moment.
    this.flashes = [0, 1].map(() => {
      const light = new THREE.PointLight(0xffc070, 0, 7, 1.5);
      scene.add(light);
      return light;
    });
    this.flashTime = [0, 0];
  }

  tracer(from, to) {
    const line = this.tracers[this.nextTracer];
    this.nextTracer = (this.nextTracer + 1) % this.tracers.length;
    const p = line.geometry.attributes.position;
    p.setXYZ(0, from.x, from.y, from.z);
    p.setXYZ(1, to.x, to.y, to.z);
    p.needsUpdate = true;
    line.userData.life = 0.06;
    line.material.opacity = 0.9;
  }

  muzzle(index, pos) {
    this.flashes[index].position.copy(pos);
    this.flashes[index].intensity = 25;
    this.flashTime[index] = 0.05;
  }

  // kind: 'spark' (metal/armor), 'chip' (wood/bark), 'dirt'
  burst(pos, kind, count = 8, dir = null) {
    const colors = { spark: [1, 0.7, 0.3], chip: [0.45, 0.32, 0.2], dirt: [0.35, 0.3, 0.22], steel: [0.85, 0.9, 1] };
    const c = colors[kind] || colors.spark;
    for (let n = 0; n < count; n++) {
      const i = this.nextP; this.nextP = (i + 1) % this.max;
      const k = i * 3;
      this.pPos[k] = pos.x; this.pPos[k + 1] = pos.y; this.pPos[k + 2] = pos.z;
      let vx = (Math.random() - 0.5) * 6, vy = Math.random() * 4 + 1, vz = (Math.random() - 0.5) * 6;
      if (dir) { vx += dir.x * 4; vz += dir.z * 4; }
      this.pVel[k] = vx; this.pVel[k + 1] = vy; this.pVel[k + 2] = vz;
      const b = 0.7 + Math.random() * 0.3;
      this.pStart[k] = c[0] * b; this.pStart[k + 1] = c[1] * b; this.pStart[k + 2] = c[2] * b;
      this.pLife[i] = 0.25 + Math.random() * 0.25;
    }
  }

  update(dt) {
    for (const t of this.tracers) {
      if (t.userData.life <= 0) continue;
      t.userData.life -= dt;
      t.material.opacity = Math.max(0, t.userData.life / 0.06) * 0.9;
    }
    for (let i = 0; i < 2; i++) {
      this.flashTime[i] -= dt;
      if (this.flashTime[i] <= 0) this.flashes[i].intensity = 0;
    }
    for (let i = 0; i < this.max; i++) {
      if (this.pLife[i] <= 0) continue;
      const k = i * 3;
      this.pLife[i] -= dt;
      if (this.pLife[i] <= 0) { this.pPos[k + 1] = -9999; continue; }
      this.pVel[k + 1] -= 14 * dt;
      this.pPos[k] += this.pVel[k] * dt;
      this.pPos[k + 1] += this.pVel[k + 1] * dt;
      this.pPos[k + 2] += this.pVel[k + 2] * dt;
      const f = Math.min(1, this.pLife[i] * 4);
      this.pCol[k] = this.pStart[k] * f; this.pCol[k + 1] = this.pStart[k + 1] * f; this.pCol[k + 2] = this.pStart[k + 2] * f;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }
}
