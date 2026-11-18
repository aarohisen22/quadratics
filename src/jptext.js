// Japanese writing for signs, banners, lanterns and plaques, and on-screen messages
// with the Japanese big and the English small underneath.
// Uses fonts already on the computer (Hiragino on a Mac, Yu Mincho / Meiryo on Windows): nothing to download.
import * as THREE from 'three';

export const JP_SERIF = '"Hiragino Mincho ProN", "Hiragino Mincho Pro", "Yu Mincho", "YuMincho", "Noto Serif JP", "MS Mincho", serif';
export const JP_BRUSH = '"Hiragino Mincho ProN", "Yu Mincho", "YuMincho", "Noto Serif JP", serif';

// A picture of some Japanese text, for a sign or banner.
//  text:     the words. vertical: true writes top to bottom (the usual way on signs and banners)
//  bg:       background colour (null = see-through), color: ink colour
//  w, h:     picture size in pixels. border: draw a thin frame. weight: font weight
export function textTexture(text, { vertical = true, bg = '#d9c7a0', color = '#1c1410', w = 128, h = 512,
  border = false, weight = 700, scale = 0.82, grain = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  if (bg) {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    if (grain) {   // faint wood grain / paper fibres (solid texture, so browser canvas noise doesn't show)
      for (let i = 0; i < 40; i++) {
        g.fillStyle = `rgba(60,40,20,${0.03 + Math.random() * 0.05})`;
        if (vertical) g.fillRect(Math.random() * w, 0, 1 + Math.random() * 3, h);
        else g.fillRect(0, Math.random() * h, w, 1 + Math.random() * 3);
      }
    }
  }
  if (border) { g.strokeStyle = color; g.lineWidth = Math.max(3, w * 0.03); g.strokeRect(g.lineWidth, g.lineWidth, w - g.lineWidth * 2, h - g.lineWidth * 2); }
  g.fillStyle = color;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const chars = [...text];
  if (vertical) {
    const size = Math.min(w * scale, (h * 0.9) / chars.length);
    g.font = `${weight} ${size}px ${JP_BRUSH}`;
    const top = h / 2 - (chars.length - 1) * size * 0.5;
    chars.forEach((ch, i) => g.fillText(ch, w / 2, top + i * size));
  } else {
    const size = Math.min(h * scale, (w * 0.9) / chars.length);
    g.font = `${weight} ${size}px ${JP_BRUSH}`;
    g.fillText(text, w / 2, h / 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// A flat board or banner with writing on both faces. Its bottom middle is at (0, 0, 0).
export function textBoard(text, width, height, opts = {}) {
  const vertical = opts.vertical ?? height > width;
  const px = vertical ? [128, Math.round(128 * height / width)] : [Math.round(128 * width / height), 128];
  const tex = textTexture(text, { vertical, w: Math.min(1024, px[0]), h: Math.min(1024, px[1]), ...opts });
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, side: THREE.DoubleSide, transparent: !opts.bg && opts.bg !== undefined });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(width, height).translate(0, height / 2, 0), mat);
  m.castShadow = true;
  return m;
}

// On-screen message: Japanese big, English small underneath. (Used with hud.toast / hud.banner.)
export function bilingual(jp, en) {
  return `<span class="jp">${jp}</span><span class="en">${en}</span>`;
}
