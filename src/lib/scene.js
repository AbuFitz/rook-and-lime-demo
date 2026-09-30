/*
 * The monolith: four hand-cut slabs of plaster (substrate, scratch coat, base
 * coat, lime finish) lit by one raking key light. Loaded on demand; the page
 * is fully readable and composed without it.
 */
import {
  DataTexture,
  LinearMipmapLinearFilter,
  RGBAFormat,
  UnsignedByteType,
  DirectionalLight,
  ExtrudeGeometry,
  Group,
  HemisphereLight,
  LinearToneMapping,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  Shape,
  SRGBColorSpace,
  Vector2,
  WebGLRenderer,
} from 'three';
import { P_COATS, mix, smooth } from './timeline.js';

const FOV = 24;
const SIDE = [0x4d4536, 0x6e6551, 0x8c8470, 0xa9a28e];
const SLAB = [
  { w: 0.73, h: 1.0, t: 0.07, seed: 3 },
  { w: 0.6935, h: 0.955, t: 0.06, seed: 11 },
  { w: 0.657, h: 0.91, t: 0.05, seed: 23 },
  { w: 0.6205, h: 0.865, t: 0.032, seed: 41 },
];

function rng(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A rectangle with a hand-cut edge: slow wobble, tiny jitter, chipped corners. */
function handCutShape({ w, h, seed }) {
  const r = rng(seed);
  const p1 = r() * 6.28;
  const p2 = r() * 6.28;
  const wob = (s) => Math.sin(s * 5.1 + p1) * 0.0045 + Math.sin(s * 13.7 + p2) * 0.0022 + (r() - 0.5) * 0.0018;
  const hw = w / 2;
  const hh = h / 2;
  const chip = () => 0.008 + r() * 0.03;
  const c = [chip(), chip(), chip(), chip()];
  const pts = [];
  const edge = (x0, y0, x1, y1, nx, ny, off0, off1) => {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(2, Math.round(len / 0.04));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const o = wob(t + x0 * 3 + y0 * 2);
      const a = mix(off0, off1, t);
      pts.push([mix(x0, x1, t) + nx * (o + a), mix(y0, y1, t) + ny * (o + a)]);
    }
  };
  // top (left→right), right (top→bottom), bottom (right→left), left (bottom→top), corners chipped
  edge(-hw + c[0], hh, hw - c[1], hh, 0, 1, 0, 0);
  edge(hw, hh - c[1], hw, -hh + c[2], 1, 0, 0, 0);
  edge(hw - c[2], -hh, -hw + c[3], -hh, 0, -1, 0, 0);
  edge(-hw, -hh + c[3], -hw, hh - c[0], -1, 0, 0, 0);
  const s = new Shape();
  pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  s.closePath();
  return s;
}

function texFrom({ data, w, h }, srgb) {
  const t = new DataTexture(data, w, h, RGBAFormat, UnsignedByteType);
  if (srgb) t.colorSpace = SRGBColorSpace;
  t.generateMipmaps = true;
  t.minFilter = LinearMipmapLinearFilter;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

export async function createScene({ canvas, gl, host, poster, layers, coarse, onLost, onRestored }) {
  const renderer = new WebGLRenderer({ canvas, context: gl, alpha: true });
  let dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 1.75);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = LinearToneMapping;
  renderer.toneMappingExposure = 1.4;
    let shadows = !coarse;
  renderer.shadowMap.enabled = shadows;

  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 0.1, 60);
  const rig = new Group();
  scene.add(rig);

  const fill = new HemisphereLight(0xeeeae0, 0x2b2a26, 1.5);
  scene.add(fill);
  const key = new DirectionalLight(0xfff5e8, 5.2);
  key.castShadow = shadows;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -1.6;
  key.shadow.camera.right = 1.6;
  key.shadow.camera.top = 1.6;
  key.shadow.camera.bottom = -1.6;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 14;
  key.shadow.bias = -0.0006;
  key.shadow.normalBias = 0.012;
  key.shadow.radius = 4;
  key.shadow.intensity = 0.62;
  scene.add(key, key.target);

  // ---- slabs
  const disposables = [];
  const slabs = SLAB.map((spec, i) => {
    const geo = new ExtrudeGeometry(handCutShape(spec), {
      depth: spec.t,
      bevelEnabled: true,
      bevelThickness: 0.006,
      bevelSize: 0.007,
      bevelSegments: 1,
      curveSegments: 1,
    });
    geo.translate(0, 0, -spec.t / 2);
    const { w: tw, h: th } = layers[i];
    const map = texFrom({ data: layers[i].albedo, w: tw, h: th }, true);
    const normalMap = texFrom({ data: layers[i].normal, w: tw, h: th }, false);
    for (const t of [map, normalMap]) {
      t.repeat.set(1 / spec.w, 1 / spec.h);
      t.offset.set(0.5, 0.5);
    }
    const face = new MeshStandardMaterial({ map, normalMap, normalScale: new Vector2(1.15, 1.15), roughness: 0.93, metalness: 0 });
    const side = new MeshStandardMaterial({ color: SIDE[i], roughness: 1, metalness: 0 });
    const mesh = new Mesh(geo, [face, side]);
    mesh.castShadow = shadows;
    mesh.receiveShadow = shadows;
    rig.add(mesh);
    disposables.push(geo, map, normalMap, face, side);
    return mesh;
  });

  // ---- state
  const S = { sample: null, px: 0, py: 0, tx: 0, ty: 0, w: 1, h: 1, gx: 0, gy: 0, dist: 10, unit: 1 };
  let visible = true;
  let running = false;
  let dirty = true;
  let raf = 0;
  let frames = 0;
  let acc = 0;
  let last = 0;
  let lost = false;

  function layout() {
    const r = host.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width));
    const h = Math.max(1, Math.round(r.height));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const pr = poster.getBoundingClientRect();
    const unit = Math.max(1, pr.height); // one world unit = the poster's height in CSS pixels
    S.w = w;
    S.h = h;
    S.unit = unit;
    S.dist = h / unit / (2 * Math.tan((FOV * Math.PI) / 360));
    S.gx = (pr.left + pr.width / 2 - r.left - w / 2) / unit;
    S.gy = -(pr.top + pr.height / 2 - r.top - h / 2) / unit;
    camera.position.set(0, 0, S.dist);
    camera.updateProjectionMatrix();
    dirty = true;
    wake();
  }

  function apply() {
    const s = S.sample;
    if (!s) return;
    const e = s.e;
    const gap = mix(0.05, 0.27, e);
    const peel = (S.h / S.unit) * 0.95 + 1.3;
    const grow = mix(1, 2.7, s.push);

    // Pivot on the middle of the coats that are laid, so the stack turns about its own centre.
    let zSum = 0;
    let wSum = 0;
    slabs.forEach((_, i) => {
      zSum += s.presence[i] * (i - 1.5) * gap;
      wSum += s.presence[i];
    });
    const zc = wSum > 0 ? zSum / wSum : 0;

    // In a portrait viewport the coats sit lower than the hero pose, clear of the step meter.
    const drop = S.h > S.w * 1.15 ? 0.2 * smooth(0, P_COATS, s.p) : 0;

    rig.scale.setScalar(grow);
    rig.position.set(mix(S.gx, 0, s.push), mix(S.gy - drop, 0, s.push), 0);
    rig.rotation.y = mix(-0.25, -0.6, e) * (1 - s.push) + S.px * 0.2;
    rig.rotation.x = mix(0.05, 0.11, e) * (1 - s.push) - S.py * 0.1;

    slabs.forEach((m, i) => {
      const k = 1 - s.presence[i];
      m.visible = k < 0.998;
      m.position.set(k * 0.7, Math.pow(k, 2.3) * peel, (i - 1.5) * gap - zc);
      m.rotation.set(-k * 0.5, 0, -k * 0.32);
    });

    // Raking key light, dragged across the surface by the pointer.
    key.position.set(S.px * 4.2 - 3.4, S.py * 2.6 + 3, 3.4 - Math.abs(S.px) * 0.5);
    key.intensity = 5 + s.push * 0.8;
    key.target.position.set(0, 0, 0);
  }

  function frame(now) {
    raf = 0;
    if (!running) return;
    const dx = S.tx - S.px;
    const dy = S.ty - S.py;
    const moving = Math.abs(dx) > 0.0008 || Math.abs(dy) > 0.0008;
    if (moving) {
      S.px += dx * 0.075;
      S.py += dy * 0.075;
      dirty = true;
    }
    if (dirty && !lost) {
      apply();
      renderer.render(scene, camera);
      dirty = false;
      // Adaptive quality: if the first second is slow, drop the expensive options.
      if (last && frames < 50) {
        acc += now - last;
        frames++;
        if (frames === 50 && acc / frames > 34) degrade();
      }
    }
    last = dirty || moving ? now : 0;
    if (dirty || moving) raf = requestAnimationFrame(frame);
  }

  function degrade() {
    dpr = 1;
    renderer.setPixelRatio(1);
    renderer.shadowMap.enabled = false;
    key.castShadow = false;
    slabs.forEach((m) => {
      m.castShadow = m.receiveShadow = false;
      m.material.forEach((mat) => (mat.needsUpdate = true));
    });
    layout();
  }

  function wake() {
    if (running && !raf && !lost) raf = requestAnimationFrame(frame);
  }
  function setRunning(v) {
    running = v && visible && !document.hidden;
    if (running) {
      dirty = true;
      wake();
    } else if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  }

  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    setRunning(true);
  });
  io.observe(host);
  const ro = new ResizeObserver(layout);
  ro.observe(host);
  const onVis = () => setRunning(true);
  document.addEventListener('visibilitychange', onVis);

  const onMove = (ev) => {
    if (ev.pointerType === 'touch') return;
    S.tx = (ev.clientX / window.innerWidth) * 2 - 1;
    S.ty = (ev.clientY / window.innerHeight) * 2 - 1;
    wake();
  };
  const onLeave = () => {
    S.tx = S.ty = 0;
    wake();
  };
  window.addEventListener('pointermove', onMove, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);

  const lostHandler = (ev) => {
    ev.preventDefault();
    lost = true;
    onLost && onLost();
  };
  const restoredHandler = () => {
    lost = false;
    dirty = true;
    onRestored && onRestored();
    wake();
  };
  canvas.addEventListener('webglcontextlost', lostHandler);
  canvas.addEventListener('webglcontextrestored', restoredHandler);

  layout();
  // Let the driver compile shaders in parallel instead of stalling the first frame.
  if (renderer.extensions.has('KHR_parallel_shader_compile')) {
    try {
      await renderer.compileAsync(scene, camera);
    } catch (e) {
      /* compile happens on first render instead */
    }
  }
  setRunning(true);

  return {
    update(sample) {
      S.sample = sample;
      dirty = true;
      wake();
    },
    resize: layout,
    render() {
      apply();
      renderer.render(scene, camera);
    },
    dispose() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('webglcontextlost', lostHandler);
      canvas.removeEventListener('webglcontextrestored', restoredHandler);
      disposables.forEach((d) => d.dispose());
      key.shadow.map && key.shadow.map.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
