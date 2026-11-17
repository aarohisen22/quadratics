// Soft see-through textures (smoke, mist, sunbeams, muzzle flash, foam) worked out pixel by pixel.
// We don't draw these on a canvas because some browsers (Safari's fingerprinting protection,
// Brave, privacy add-ons) sprinkle coloured noise into canvas pictures, and on faint, see-through
// things that noise shows up as confetti.
import * as THREE from 'three';

// w x h texture. fill(u, v) gives [r, g, b, a] (0..1) for each pixel; u, v run 0..1 across and down.
export function pixelTexture(w, h, fill) {
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [r, g, b, a] = fill((x + 0.5) / w, (y + 0.5) / h);
      const k = ((h - 1 - y) * w + x) * 4;   // row 0 is the bottom of a texture
      data[k] = r * 255; data[k + 1] = g * 255; data[k + 2] = b * 255;
      data[k + 3] = Math.max(0, Math.min(1, a)) * 255;
    }
  }
  return finish(new THREE.DataTexture(data, w, h, THREE.RGBAFormat));
}

// Starts empty (fully see-through white); add soft round blobs, then call done().
export function blobTexture(n) {
  const alpha = new Float32Array(n * n);
  return {
    blob(cx, cy, r, a) {   // in pixels
      const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(n - 1, Math.ceil(cx + r));
      const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(n - 1, Math.ceil(cy + r));
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / r;
        if (d < 1) alpha[y * n + x] += a * (1 - d);
      }
    },
    done() {
      const data = new Uint8Array(n * n * 4);
      for (let i = 0; i < n * n; i++) {
        data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = 255;
        data[i * 4 + 3] = Math.min(1, alpha[i]) * 255;
      }
      return finish(new THREE.DataTexture(data, n, n, THREE.RGBAFormat));
    },
  };
}

function finish(t) {
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}
