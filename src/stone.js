// The Quadratic Stone: four jade pieces making a square, floating over a stone pedestal in front of
// the shrine. In Story mode the pieces come back one by one. Also: a single piece you can pick up,
// and the golden beam of light that shows where to go next.
import * as THREE from 'three';

// A soft round glow (drawn once, used as a sprite).
let glowTex = null;
function glowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.25, 'rgba(255,255,255,0.45)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  glowTex = new THREE.CanvasTexture(c);
  return glowTex;
}
function glow(color, size) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  s.scale.setScalar(size);
  return s;
}

// One quarter of the Stone: a thick jade tile with a carved line, corner `q` (0-3).
const PIECE = 0.42, GAP = 0.05;
function pieceMesh(mat) {
  const g = new THREE.Group();
  const tile = new THREE.Mesh(new THREE.BoxGeometry(PIECE, PIECE, 0.16), mat);
  tile.castShadow = true;
  g.add(tile);
  return g;
}
const CORNERS = [[-1, 1], [1, 1], [-1, -1], [1, -1]];

export class QuadStone {
  constructor(scene, world) {
    const T = world.templeSpot, S = world.areas.byId.shrine;
    const yaw = Math.atan2(S.x - T.x, S.z - T.z);   // the shrine faces this way
    const x = T.x + Math.sin(yaw) * 5.2, z = T.z + Math.cos(yaw) * 5.2;
    this.base = new THREE.Vector3(x, world.templeTop, z);
    this.group = new THREE.Group();
    this.group.position.copy(this.base);
    this.group.rotation.y = yaw;
    scene.add(this.group);
    world.obstacles.push({ x, z, r: 0.6, base: world.templeTop, h: 99 });

    const stone = new THREE.MeshStandardMaterial({ color: 0x77736a, roughness: 0.9, flatShading: true });
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 1.0, 8), stone);
    ped.position.y = 0.5; ped.castShadow = ped.receiveShadow = true;
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.4, 0.18, 8), stone);
    cap.position.y = 1.08;
    this.group.add(ped, cap);

    this.lit = new THREE.MeshStandardMaterial({ color: 0x1f9a66, emissive: 0x0d8a58, emissiveIntensity: 0.9, roughness: 0.3, metalness: 0.1 });
    this.dark = new THREE.MeshStandardMaterial({ color: 0x3e5a4c, emissive: 0x0c2a1e, emissiveIntensity: 0.5, roughness: 0.5 });
    this.holder = new THREE.Group();
    this.holder.position.y = 1.75;
    this.group.add(this.holder);
    this.pieces = CORNERS.map(([cx, cy]) => {
      const p = pieceMesh(this.lit);
      p.position.set(cx * (PIECE / 2 + GAP), cy * (PIECE / 2 + GAP), 0);
      this.holder.add(p);
      return p;
    });
    this.halo = glow(0x60ffc0, 2.6);
    this.holder.add(this.halo);
    this.t = 0;
    this.shine = 0;   // extra brightness for the ending
    this.set(4, true);
  }

  // How many pieces are in place, and whether they shine (or sit dark under the Shogun's curse).
  set(count, shining = true) {
    this.count = count;
    this.shining = shining;
    this.pieces.forEach((p, i) => {
      p.visible = i < count;
      p.children[0].material = shining ? this.lit : this.dark;
    });
    this.halo.visible = count > 0;
    this.halo.material.color.set(shining ? 0x60ffc0 : 0x2a6a50);
  }

  update(dt) {
    this.t += dt;
    this.holder.rotation.y = Math.sin(this.t * 0.6) * 0.5;
    this.holder.position.y = 1.75 + Math.sin(this.t * 1.4) * 0.06;
    this.shine = Math.max(0, this.shine - dt * 0.15);
    const pulse = 1 + Math.sin(this.t * 2.2) * 0.15;
    this.lit.emissiveIntensity = 0.9 * pulse + this.shine * 3;
    this.halo.scale.setScalar((this.shining ? 2.6 : 1.6) * pulse + this.shine * 5);
    this.halo.material.opacity = this.shining ? 0.45 : 0.25;
  }

  get top() { return this.holder.getWorldPosition(new THREE.Vector3()); }
}

// A piece of the Stone lying where a captain fell: spins, bobs and glows until a brother walks into it.
export class StonePiece {
  constructor(scene, world, x, z) {
    this.scene = scene;
    this.pos = new THREE.Vector3(x, world.heightAt(x, z), z);
    this.group = new THREE.Group();
    this.group.position.copy(this.pos);
    const mat = new THREE.MeshStandardMaterial({ color: 0x1f9a66, emissive: 0x0d8a58, emissiveIntensity: 1.1, roughness: 0.3 });
    this.mesh = pieceMesh(mat);
    this.mesh.scale.setScalar(1.6);
    this.group.add(this.mesh, glow(0x60ffc0, 2.2));
    scene.add(this.group);
    this.t = 0;
  }
  update(dt) {
    this.t += dt;
    this.mesh.rotation.y += dt * 2;
    this.mesh.position.y = 1.1 + Math.sin(this.t * 3) * 0.12;
    this.group.children[1].position.y = this.mesh.position.y;
  }
  remove() { this.scene.remove(this.group); }
}

// A tall column of golden light over the place to go next. Visible from far away, through the fog.
export class Beacon {
  constructor(scene) {
    const mat = new THREE.MeshBasicMaterial({ color: 0xffd070, transparent: true, opacity: 0.35, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
    this.beam = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 90, 20, 1, true), mat);
    this.core = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 90, 10, 1, true), mat.clone());
    this.core.material.opacity = 0.6;
    this.group = new THREE.Group();
    this.group.add(this.beam, this.core);
    this.group.visible = false;
    scene.add(this.group);
    this.t = 0;
  }
  show(x, y, z) {
    this.group.position.set(x, y + 45, z);
    this.group.visible = true;
  }
  hide() { this.group.visible = false; }
  update(dt) {
    this.t += dt;
    this.beam.material.opacity = 0.22 + Math.sin(this.t * 2.4) * 0.08;
    this.beam.rotation.y += dt * 0.5;
  }
}
