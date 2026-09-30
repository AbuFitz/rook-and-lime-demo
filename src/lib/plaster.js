/*
 * Procedural plaster surfaces, painted once to a canvas with a raking light.
 * Used for the static poster, the project plates and the material specimens,
 * so the whole page shares one material world without any image files.
 */

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Tileless value-noise fbm over a lattice, sampled straight into a Float32Array. */
function fbmField(w, h, rand, { freq, octaves, gain = 0.5, stretchX = 1, stretchY = 1 }) {
  const out = new Float32Array(w * h);
  let amp = 1;
  let norm = 0;
  let f = freq;
  for (let o = 0; o < octaves; o++) {
    const gw = Math.ceil(f * stretchX) + 2;
    const gh = Math.ceil(f * stretchY) + 2;
    const grid = new Float32Array(gw * gh);
    for (let i = 0; i < grid.length; i++) grid[i] = rand();
    const sx = (f * stretchX) / w;
    const sy = (f * stretchY) / h;
    for (let y = 0; y < h; y++) {
      const fy = y * sy;
      const iy = fy | 0;
      const ty = fy - iy;
      const uy = ty * ty * (3 - 2 * ty);
      for (let x = 0; x < w; x++) {
        const fx = x * sx;
        const ix = fx | 0;
        const tx = fx - ix;
        const ux = tx * tx * (3 - 2 * tx);
        const a = grid[iy * gw + ix];
        const b = grid[iy * gw + ix + 1];
        const c = grid[(iy + 1) * gw + ix];
        const d = grid[(iy + 1) * gw + ix + 1];
        out[y * w + x] += amp * (a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy);
      }
    }
    norm += amp;
    amp *= gain;
    f *= 2.03;
  }
  for (let i = 0; i < out.length; i++) out[i] /= norm;
  return out;
}

function strokesField(w, h, rand, { count, arc }) {
  const c = new OffscreenCanvas(w, h);
  const g = c.getContext('2d', { willReadFrequently: true });
  g.fillStyle = '#000';
  g.fillRect(0, 0, w, h);
  g.lineCap = 'round';
  for (let i = 0; i < count; i++) {
    const cx = rand() * w;
    const cy = rand() * h;
    const r = (0.25 + rand() * 0.9) * Math.max(w, h) * arc;
    const a0 = rand() * Math.PI * 2;
    const span = 0.25 + rand() * 0.55;
    const lw = (0.03 + rand() * 0.09) * Math.min(w, h) * arc;
    const shade = 40 + rand() * 160;
    g.strokeStyle = `rgba(${shade | 0},${shade | 0},${shade | 0},${0.12 + rand() * 0.22})`;
    g.lineWidth = lw;
    g.beginPath();
    g.arc(cx, cy, r, a0, a0 + span);
    g.stroke();
  }
  const d = g.getImageData(0, 0, w, h).data;
  const out = new Float32Array(w * h);
  for (let i = 0; i < out.length; i++) out[i] = d[i * 4] / 255;
  return out;
}

function pebbles(field, w, h, rand, count, rMin, rMax, depth) {
  for (let i = 0; i < count; i++) {
    const cx = rand() * w;
    const cy = rand() * h;
    const r = rMin + rand() * (rMax - rMin);
    const hgt = depth * (0.4 + rand() * 0.6);
    const x0 = Math.max(0, (cx - r) | 0);
    const x1 = Math.min(w - 1, (cx + r) | 0);
    const y0 = Math.max(0, (cy - r) | 0);
    const y1 = Math.min(h - 1, (cy + r) | 0);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const d = Math.hypot(x - cx, y - cy) / r;
        if (d < 1) field[y * w + x] += hgt * Math.sqrt(1 - d * d);
      }
    }
  }
}

function scoring(field, w, h, rand, { angle, spacing, depth, jitter, gap }) {
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  const wob = fbmField(w, h, rand, { freq: 3, octaves: 2 });
  const brk = fbmField(w, h, rand, { freq: 5, octaves: 2 });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const t = (x * ca + y * sa) / spacing + (wob[i] - 0.5) * jitter;
      const s = Math.abs(Math.sin(t * Math.PI));
      const groove = Math.pow(1 - s, 7);
      if (brk[i] > gap) field[i] -= depth * groove * Math.min(1, (brk[i] - gap) * 6);
    }
  }
}

/**
 * @param {object} o
 * @param {number} o.seed
 * @param {number[]} o.base   RGB 0-255
 * @param {'aggregate'|'crosshatch'|'combed'|'float'|'trowel'|'putty'} o.kind
 */
export function makePlasterData({ w = 512, h = 512, seed = 1, base, kind = 'trowel', relief = 1, contrast = 1, light = [-0.55, -0.6, 0.6], mottle = 0.08, normal = false }) {
  const rand = mulberry32(seed * 7919 + 13);
  const height = fbmField(w, h, rand, { freq: 3, octaves: 4, gain: 0.5 });
  const fine = fbmField(w, h, rand, { freq: Math.max(w, h) / 5, octaves: 1 });
  const cloud = fbmField(w, h, rand, { freq: 2, octaves: 3 });

  const field = new Float32Array(w * h);
  const S = w / 512;
  switch (kind) {
    case 'aggregate':
      for (let i = 0; i < field.length; i++) field[i] = height[i] * 0.5 + fine[i] * 0.35;
      pebbles(field, w, h, rand, Math.round((w * h) / 520), 2 * S, 7 * S, 0.5);
      break;
    case 'crosshatch':
      for (let i = 0; i < field.length; i++) field[i] = height[i] * 0.35 + fine[i] * 0.2;
      scoring(field, w, h, rand, { angle: 0.62, spacing: 15 * S, depth: 0.95, jitter: 1.8, gap: 0.28 });
      scoring(field, w, h, rand, { angle: -0.66, spacing: 19 * S, depth: 0.7, jitter: 1.8, gap: 0.42 });
      break;
    case 'combed':
      for (let i = 0; i < field.length; i++) field[i] = height[i] * 0.4 + fine[i] * 0.2;
      scoring(field, w, h, rand, { angle: Math.PI / 2, spacing: 11 * S, depth: 0.9, jitter: 0.6, gap: 0.22 });
      break;
    case 'float':
      for (let i = 0; i < field.length; i++) field[i] = height[i] * 0.55 + fine[i] * 0.3;
      pebbles(field, w, h, rand, Math.round((w * h) / 2600), 1.5 * S, 3.5 * S, 0.25);
      break;
    case 'putty': {
      const st = strokesField(w, h, rand, { count: 34, arc: 1.3 });
      for (let i = 0; i < field.length; i++) field[i] = height[i] * 0.35 + fine[i] * 0.06 + st[i] * 0.9;
      break;
    }
    case 'trowel':
    default: {
      const st = strokesField(w, h, rand, { count: 46, arc: 1 });
      for (let i = 0; i < field.length; i++) field[i] = height[i] * 0.4 + fine[i] * 0.08 + st[i] * 0.75;
      break;
    }
  }

  const px = new Uint8ClampedArray(w * h * 4);

  const ll = Math.hypot(light[0], light[1], light[2]);
  const lx = light[0] / ll;
  const ly = light[1] / ll;
  const lz = light[2] / ll;
  const k = 5.2 * relief * (w / 512);
  const [br, bg, bb] = base;

  for (let y = 0; y < h; y++) {
    const ym = Math.max(0, y - 1) * w;
    const yp = Math.min(h - 1, y + 1) * w;
    for (let x = 0; x < w; x++) {
      const xm = Math.max(0, x - 1);
      const xp = Math.min(w - 1, x + 1);
      const i = y * w + x;
      const dx = (field[y * w + xp] - field[y * w + xm]) * k;
      const dy = (field[yp + x] - field[ym + x]) * k;
      const inv = 1 / Math.hypot(dx, dy, 1);
      const ndl = (-dx * lx - dy * ly + lz) * inv;
      const shade = 0.72 + 0.5 * (ndl - 0.75) * contrast + (field[i] - 0.4) * 0.25 * contrast;
      const tint = 1 + (cloud[i] - 0.5) * mottle * 2;
      const m = Math.max(0.15, shade) * tint;
      const o = i * 4;
      px[o] = Math.min(255, br * m + 3);
      px[o + 1] = Math.min(255, bg * m + 3);
      px[o + 2] = Math.min(255, bb * m + 2);
      px[o + 3] = 255;
    }
  }

  // Optional tangent-space normal map from the same height field, for the WebGL slabs.
  let nd = null;
  if (normal) {
    nd = new Uint8ClampedArray(w * h * 4);
    const kn = 2.6 * relief * (w / 512);
    for (let y = 0; y < h; y++) {
      const ym = Math.max(0, y - 1) * w;
      const yp = Math.min(h - 1, y + 1) * w;
      for (let x = 0; x < w; x++) {
        const xm = Math.max(0, x - 1);
        const xp = Math.min(w - 1, x + 1);
        const nx = -(field[y * w + xp] - field[y * w + xm]) * kn;
        const ny = (field[yp + x] - field[ym + x]) * kn;
        const inv = 1 / Math.hypot(nx, ny, 1);
        const o = (y * w + x) * 4;
        nd[o] = (nx * inv * 0.5 + 0.5) * 255;
        nd[o + 1] = (ny * inv * 0.5 + 0.5) * 255;
        nd[o + 2] = (inv * 0.5 + 0.5) * 255;
        nd[o + 3] = 255;
      }
    }
  }
  return { w, h, rgba: px, normal: nd };
}
