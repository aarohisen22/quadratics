// Visual effects: bullet tracers, muzzle flashes and sparks.
import * as THREE from 'three';
import { muzzleFlashTexture, MAT } from './models.js';

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
    this.flashSprites = [0, 1].map(() => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: muzzleFlashTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      sp.visible = false;
      scene.add(sp);
      return sp;
    });

    // Brass shell casings that fly out of the gun and bounce on the ground.
    this.casingMax = 120;
    this.casings = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.012, 0.012, 0.035, 6), MAT.brass, this.casingMax);
    this.casings.castShadow = false;
    this.casings.frustumCulled = false;
    this.casingData = [];
    for (let i = 0; i < this.casingMax; i++) {
      this.casingData.push({ p: new THREE.Vector3(0, -999, 0), v: new THREE.Vector3(), spin: new THREE.Euler(), life: 0 });
    }
    this.nextCasing = 0;
    this.dummy = new THREE.Object3D();
    scene.add(this.casings);
    this.world = null;  // set by main so casings know where the ground is
  }

  // A thick cloud of smoke that billows out, hangs around, then thins away.
  smokeCloud(x, y, z, radius, seconds) {
    if (!this.smokeTex) {
      const c = document.createElement('canvas');
      c.width = c.height = 128;
      const g = c.getContext('2d');
      for (let i = 0; i < 9; i++) {   // lumpy puff made of overlapping blobs
        const bx = 40 + Math.random() * 48, by = 40 + Math.random() * 48, br = 24 + Math.random() * 20;
        const grad = g.createRadialGradient(bx, by, 0, bx, by, br);
        grad.addColorStop(0, 'rgba(255,255,255,0.55)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
      }
      this.smokeTex = new THREE.CanvasTexture(c);
      this.smokeParts = [];
    }
    for (let i = 0; i < 22; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this.smokeTex, color: 0xb9bdb8, transparent: true, depthWrite: false, opacity: 0,
      }));
      const a = Math.random() * Math.PI * 2, d = Math.random() * radius * 0.8;
      sp.position.set(x + Math.cos(a) * d, y + 0.5 + Math.random() * 2.2, z + Math.sin(a) * d);
      sp.material.rotation = Math.random() * 6;
      sp.userData = { age: 0, life: seconds + Math.random() * 1.5, size: 3 + Math.random() * 3, spin: (Math.random() - 0.5) * 0.4 };
      this.scene.add(sp);
      this.smokeParts.push(sp);
    }
  }

  clearSmoke() {
    for (const sp of this.smokeParts || []) { this.scene.remove(sp); sp.material.dispose(); }
    if (this.smokeParts) this.smokeParts = [];
  }

  casing(pos, side) {
    const c = this.casingData[this.nextCasing];
    this.nextCasing = (this.nextCasing + 1) % this.casingMax;
    c.p.copy(pos);
    c.v.set(side.x * (2 + Math.random() * 1.5), 2.5 + Math.random() * 1.5, side.z * (2 + Math.random() * 1.5));
    c.spin.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    c.life = 6;
    c.bounced = false;
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

  muzzle(index, pos, size = 1) {
    this.flashes[index].position.copy(pos);
    this.flashes[index].intensity = 30;
    this.flashTime[index] = 0.05;
    const sp = this.flashSprites[index];
    sp.position.copy(pos);
    sp.scale.setScalar((0.45 + Math.random() * 0.35) * size);
    sp.material.rotation = Math.random() * Math.PI;
    sp.visible = true;
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
      if (this.flashTime[i] <= 0) { this.flashes[i].intensity = 0; this.flashSprites[i].visible = false; }
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

    if (this.smokeParts) {
      for (const sp of this.smokeParts) {
        const u = sp.userData;
        u.age += dt;
        const grow = Math.min(1, u.age / 0.8);
        sp.scale.setScalar(u.size * (0.4 + grow * 0.6 + u.age * 0.04));
        sp.material.rotation += u.spin * dt;
        sp.position.y += dt * 0.15;
        sp.material.opacity = Math.min(grow, Math.max(0, (u.life - u.age) / 1.5)) * 0.85;
        if (u.age >= u.life) { this.scene.remove(sp); sp.material.dispose(); u.dead = true; }
      }
      this.smokeParts = this.smokeParts.filter(sp => !sp.userData.dead);
    }

    for (let i = 0; i < this.casingMax; i++) {
      const c = this.casingData[i];
      if (c.life > 0 && this.world) {
        c.life -= dt;
        const ground = this.world.heightAt(c.p.x, c.p.z) + 0.012;
        if (c.p.y > ground || c.v.y > 0) {
          c.v.y -= 20 * dt;
          c.p.addScaledVector(c.v, dt);
          c.spin.x += dt * 25; c.spin.z += dt * 18;
          if (c.p.y < ground) {
            c.p.y = ground;
            if (!c.bounced) { c.v.set(c.v.x * 0.35, -c.v.y * 0.3, c.v.z * 0.35); c.bounced = true; }
            else { c.v.set(0, 0, 0); c.spin.set(Math.PI / 2, c.spin.y, 0); }
          }
        }
        if (c.life <= 0) c.p.y = -999;
      }
      this.dummy.position.copy(c.p);
      this.dummy.rotation.copy(c.spin);
      this.dummy.updateMatrix();
      this.casings.setMatrixAt(i, this.dummy.matrix);
    }
    this.casings.instanceMatrix.needsUpdate = true;
  }
}
