import './styles/base.css';
import './styles/stage.css';
import './styles/sections.css';
import { P_COATS, sample } from './lib/timeline.js';

const root = document.documentElement;
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

const scrolly = root.classList.contains('is-scrolly');
const coarse = matchMedia('(pointer: coarse)').matches || innerWidth < 700;
const TEX = coarse ? 384 : 512;

const header = $('.site-header');
const stage = $('.stage');
const coats = $$('.coat');

/* ------------------------------------------------------------------
   Procedural textures: painted lazily, one per task, never blocking input.
------------------------------------------------------------------- */

let worker = null;
let nextId = 1;
const pending = new Map();

function paint(opts, gl = false) {
  if (!worker) {
    worker = new Worker(new URL('./lib/plaster.worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }) => {
      const job = pending.get(data.id);
      pending.delete(data.id);
      if (!job) return;
      if (data.error) job.reject(new Error(data.error));
      else job.resolve(data.out);
    };
  }
  return new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    worker.postMessage({ id, opts, gl });
  });
}

const cssUrl = (blob) => `url(${URL.createObjectURL(blob)})`;
const plasterUrl = async (opts) => cssUrl((await paint(opts)).blob);

const POSTER = [
  { seed: 1, base: [116, 107, 88], kind: 'aggregate', contrast: 1.1 },
  { seed: 2, base: [157, 146, 124], kind: 'crosshatch', contrast: 1.15 },
  { seed: 3, base: [197, 188, 167], kind: 'float', contrast: 1 },
  { seed: 4, base: [235, 230, 218], kind: 'trowel', contrast: 1, relief: 0.32, mottle: 0.16 },
];

const SURFACES = {
  stair: { w: 640, h: 480, seed: 5, base: [215, 209, 193], kind: 'trowel', relief: 0.8 },
  bar: { w: 560, h: 448, seed: 6, base: [176, 128, 95], kind: 'float', relief: 1.1 },
  fitting: { w: 448, h: 640, seed: 7, base: [163, 168, 151], kind: 'trowel', relief: 0.7 },
  hearth: { w: 512, h: 640, seed: 8, base: [52, 50, 44], kind: 'combed', relief: 1, contrast: 1.4 },
};
const SWATCHES = {
  putty: { seed: 9, base: [222, 217, 203], kind: 'putty' },
  aggregate: { seed: 10, base: [139, 128, 103], kind: 'aggregate' },
  pigment: { seed: 12, base: [168, 111, 83], kind: 'float' },
  time: { seed: 13, base: [183, 176, 156], kind: 'crosshatch' },
};

const layerCanvases = [];

async function paintPoster() {
  await Promise.all(
    POSTER.map(async (spec, i) => {
      const out = await paint({ ...spec, w: TEX, h: TEX, normal: scrolly }, scrolly);
      layerCanvases[i] = { w: out.w, h: out.h, albedo: out.albedo, normal: out.normal };
      stage.style.setProperty(`--tex-${i}`, cssUrl(out.blob));
    }),
  );
}

async function paintWash() {
  stage.style.setProperty('--tex-wash', await plasterUrl({ w: TEX, h: TEX, seed: 31, base: [235, 230, 218], kind: 'trowel', relief: 0.5, contrast: 0.9 }));
}

function lazyPaint() {
  const jobs = [];
  $$('.plate__surface').forEach((el) =>
    jobs.push({ el, run: async () => el.style.setProperty(`--tex-${el.dataset.finish}`, await plasterUrl(SURFACES[el.dataset.finish])) }),
  );
  $$('.specimen__swatch').forEach((el) =>
    jobs.push({ el, run: async () => el.style.setProperty('--tex', await plasterUrl({ ...SWATCHES[el.dataset.swatch], w: 384, h: 432 })) }),
  );
  const panel = $('.consult__panel');
  if (panel) {
    jobs.push({
      el: panel,
      run: async () => panel.style.setProperty('--tex-consult', await plasterUrl({ w: 512, h: 512, seed: 21, base: [228, 223, 209], kind: 'trowel', relief: 0.55, contrast: 0.8 })),
    });
  }

  const map = new Map(jobs.map((j) => [j.el, j]));
  const io = new IntersectionObserver(
    (entries) => {
      for (const en of entries) {
        if (!en.isIntersecting) continue;
        io.unobserve(en.target);
        map.get(en.target).run().catch(() => {});
      }
    },
    { rootMargin: '900px 0px' },
  );
  jobs.forEach((j) => io.observe(j.el));
}

/* ------------------------------------------------------------------
   Stage: scroll timeline → CSS custom properties and the WebGL scene
------------------------------------------------------------------- */

let scene = null;
let stageTop = 0;
let stageRange = 1;
let lastStep = -1;
let lastWash = -1;
let lastE = -1;
let washOn = false;

function measure() {
  const r = stage.getBoundingClientRect();
  stageTop = r.top + scrollY;
  stageRange = Math.max(1, stage.offsetHeight - innerHeight);
}

function updateStage() {
  const p = Math.min(1, Math.max(0, (scrollY - stageTop) / stageRange));
  const s = sample(p);
  if (Math.abs(s.e - lastE) > 0.002) {
    stage.style.setProperty('--e', s.e.toFixed(3));
    lastE = s.e;
  }
  if (Math.abs(s.wash - lastWash) > 0.002) {
    stage.style.setProperty('--wash', s.wash.toFixed(3));
    lastWash = s.wash;
  }
  if (s.step !== lastStep) {
    stage.dataset.step = String(s.step);
    coats.forEach((li, i) => li.classList.toggle('is-active', s.step === i + 1));
    lastStep = s.step;
  }
  washOn = s.wash > 0.55;
  stage.classList.toggle('is-washing', s.wash > 0.08);
  if (scene) scene.update(s);
}

function updateHeader() {
  const y = scrollY;
  header.dataset.solid = y > 24 ? 'true' : 'false';
  const probe = y + 40;
  let tone = 'dark';
  for (const sec of $$('main > section, footer')) {
    const top = sec.getBoundingClientRect().top + y;
    if (top <= probe) tone = sec.dataset.tone || 'dark';
  }
  if (scrolly && tone === 'dark' && stage.getBoundingClientRect().bottom > 40 && washOn) tone = 'light';
  if (header.dataset.tone !== tone) header.dataset.tone = tone;
}

let queued = false;
function onScroll() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    if (scrolly) updateStage();
    updateHeader();
  });
}

/** One context, made here so a missing GPU is a quiet fallback and never a console error. */
function makeContext(canvas) {
  const attrs = { alpha: true, antialias: !coarse, powerPreference: 'high-performance' };
  try {
    return canvas.getContext('webgl2', attrs) || canvas.getContext('webgl', attrs);
  } catch (e) {
    return null;
  }
}

async function bootScene(posterReady) {
  if (!scrolly) return;
  await posterReady;
  if (!layerCanvases[3]) return;
  // Without WebGL the CSS poster stays as the designed fallback; skip the engine entirely.
  const canvas = $('.stage__canvas');
  const gl = makeContext(canvas);
  if (!gl) return;
  try {
    const { createScene } = await import('./lib/scene.js');
    scene = await createScene({
      canvas,
      gl,
      host: $('.stage__visual'),
      poster: $('.poster'),
      layers: layerCanvases,
      coarse,
      onLost: () => stage.classList.remove('is-live'),
      onRestored: () => stage.classList.add('is-live'),
    });
    updateStage();
    scene.render();
    requestAnimationFrame(() => stage.classList.add('is-live'));
  } catch (err) {
    // The scene failed: the CSS poster keeps the stage composed.
    console.info('Monolith scene unavailable, using the static poster.', err && err.message);
    scene = null;
    stage.classList.remove('is-live');
  }
}

/* ------------------------------------------------------------------
   Navigation
------------------------------------------------------------------- */

const toggle = $('.menu-toggle');
const nav = $('#site-nav');
const mainEl = $('main');

function setMenu(open) {
  root.classList.toggle('menu-open', open);
  toggle.setAttribute('aria-expanded', String(open));
  toggle.querySelector('.menu-toggle__label').textContent = open ? 'Close' : 'Menu';
  mainEl.inert = open;
  $('.site-footer').inert = open;
}
toggle.addEventListener('click', () => setMenu(!root.classList.contains('menu-open')));
nav.addEventListener('click', (ev) => {
  if (ev.target.closest('a')) setMenu(false);
});
document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape' && root.classList.contains('menu-open')) {
    setMenu(false);
    toggle.focus();
  }
});
matchMedia('(min-width: 62.01rem)').addEventListener('change', (m) => m.matches && setMenu(false));

// In the pinned layout the "coats" link goes to the first coat, not to hidden markup.
$$('a[href="#coats"]').forEach((a) =>
  a.addEventListener('click', (ev) => {
    if (!scrolly) return;
    ev.preventDefault();
    measure();
    const target = stageTop + stageRange * (P_COATS + 0.02);
    scrollTo({ top: target, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    history.replaceState(null, '', '#coats');
  }),
);

/* ------------------------------------------------------------------
   Reveals, pointer light, clipboard
------------------------------------------------------------------- */

function reveals() {
  const items = $$('[data-reveal]');
  if (!('IntersectionObserver' in window)) return items.forEach((el) => el.classList.add('is-in'));
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
  );
  items.forEach((el) => io.observe(el));
}

function plateLight() {
  $$('.plate__surface').forEach((el) => {
    let raf = 0;
    let pos = [0, 0];
    el.addEventListener('pointermove', (ev) => {
      if (ev.pointerType === 'touch') return;
      const r = el.getBoundingClientRect();
      pos = [((ev.clientX - r.left) / r.width) * 100, ((ev.clientY - r.top) / r.height) * 100];
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        el.style.setProperty('--lx', pos[0].toFixed(1) + '%');
        el.style.setProperty('--ly', pos[1].toFixed(1) + '%');
      });
    });
    el.addEventListener('pointerleave', () => {
      el.style.removeProperty('--lx');
      el.style.removeProperty('--ly');
    });
  });
}

function clipboard() {
  const btn = $('#copy-mail');
  const status = $('#copy-status');
  const label = $('[data-copy-label]', btn);
  let timer;
  btn.addEventListener('click', async () => {
    const addr = btn.dataset.email;
    let ok = false;
    try {
      await navigator.clipboard.writeText(addr);
      ok = true;
    } catch (e) {
      ok = false;
    }
    status.textContent = ok ? `Copied ${addr}` : `Copy was blocked. The address is ${addr}.`;
    label.textContent = ok ? 'Copied' : 'Copy email address';
    clearTimeout(timer);
    timer = setTimeout(() => {
      label.textContent = 'Copy email address';
      status.textContent = '';
    }, 4000);
  });
}

/* ------------------------------------------------------------------ */

reveals();
plateLight();
clipboard();
measure();
updateHeader();
if (scrolly) updateStage();
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', () => {
  measure();
  onScroll();
});
addEventListener('load', () => {
  measure();
  onScroll();
});
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measure(); onScroll(); });

// Switching reduced-motion on or off mid-visit swaps the whole layout, so start clean.
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => location.reload());

addEventListener('pagehide', (ev) => {
  if (ev.persisted) return;
  if (scene) scene.dispose();
  if (worker) worker.terminate();
});

// Texture painting runs in a worker, so it can begin at once; only the engine waits for idle time.
const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 60));
const posterReady = paintPoster().catch(() => {});
if (scrolly) paintWash().catch(() => {});
requestAnimationFrame(() =>
  idle(
    () => {
      lazyPaint();
      if (scrolly) bootScene(posterReady);
    },
    { timeout: 500 },
  ),
);
