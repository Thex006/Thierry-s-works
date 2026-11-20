import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, BufferGeometry, Float32BufferAttribute,
  MeshStandardMaterial, MeshPhysicalMaterial, Texture, SRGBColorSpace, HemisphereLight, DirectionalLight,
  DoubleSide, PMREMGenerator, NeutralToneMapping, LinearMipmapLinearFilter, LinearFilter
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

'use strict';

/* ---------------- data ---------------- */
// Each flavour has one 2048 x 2048 transparent sheet. Item 0 is the bottle, the rest are real fruit cut outs.
// The bottle and the sharp fruit are rebuilt as real 3D meshes from those photos; blurred corner pieces stay 2D crops.
const FLAVOURS = window.JB;
const SHEET = 2048;
const FACTORS = [0.40, 0.30, 0.15, 0.55, 0.75]; // word, shadow, cup, fruit, corner
const SHADOWS = [[345, 650, 170, 24], [720, 712, 250, 30], [1318, 638, 160, 22], [1045, 760, 150, 22]];
const DUR = 970;
const COVER = [
  [0, 0], [0.031, 0.006], [0.134, 0.012], [0.206, 0.023], [0.278, 0.047], [0.34, 0.07],
  [0.412, 0.105], [0.485, 0.158], [0.546, 0.246], [0.583, 0.55], [0.62, 0.825], [0.69, 0.9],
  [0.79, 0.94], [0.85, 0.956], [0.93, 0.975], [1, 1]
];
const q = new URLSearchParams(location.search);
const REDUCED = q.has('reduced');

const root = document.documentElement;
const stage = document.getElementById('stage');
const tabsEl = document.getElementById('tabs');
const ul = document.getElementById('ul');

const U = v => `calc(${+v.toFixed(3)} * var(--u))`;
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = k => 3 * k * k - 2 * k * k * k;
const easeOutQuad = k => 1 - (1 - k) * (1 - k);
function cover(t) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  for (let i = 1; i < COVER.length; i++) {
    const [t1, c1] = COVER[i];
    if (t <= t1) { const [t0, c0] = COVER[i - 1]; return c0 + (c1 - c0) * smooth((t - t0) / (t1 - t0)); }
  }
  return 1;
}
const rnd = (a, b) => a + Math.random() * (b - a);
function crop(el, url, box, W) {
  const [bx, by, bw, bh] = box, s = W / bw;
  el.style.backgroundImage = `url("${url}")`;
  el.style.backgroundSize = `${U(SHEET * s)} ${U(SHEET * s)}`;
  el.style.backgroundPosition = `${U(-bx * s)} ${U(-by * s)}`;
  return bh * s;
}

/* ---------------- 3D: photo-driven meshes ---------------- */
// Rebuild a solid from a cut out photo: every row of the silhouette becomes an elliptical ring
// (width from the photo, depth = width x depthFactor). The photo is projected on the front, so the
// real fruit and the real label keep their detail while the object turns and catches light.
function buildSolid(alpha, box, w, depth, rows, segs) {
  const [bx, by, bw, bh] = box;
  const s = w / bw;
  const prof = [];
  for (let r = 0; r <= rows; r++) {
    const y = Math.min(bh - 1, Math.round(r / rows * (bh - 1)));
    let L = -1, R = -1;
    const row = (by + y) * SHEET;
    for (let x = 0; x < bw; x++) if (alpha[(row + bx + x) * 4 + 3] > 110) { if (L < 0) L = x; R = x; }
    prof.push(L < 0 ? null : [y, L, R + 1]);
  }
  let first = prof.findIndex(p => p), last = prof.length - 1 - [...prof].reverse().findIndex(p => p);
  const P = [];
  for (let i = first; i <= last; i++) {
    if (prof[i]) { P.push(prof[i]); continue; }
    let a = i - 1; while (!prof[a]) a--; let b = i + 1; while (!prof[b]) b++;
    const t = (i - a) / (b - a), y = Math.round(r2y(i));
    P.push([y, prof[a][1] + (prof[b][1] - prof[a][1]) * t, prof[a][2] + (prof[b][2] - prof[a][2]) * t]);
  }
  function r2y(i) { return Math.min(bh - 1, i / rows * (bh - 1)); }
  // light smoothing of the outline so stray pixels don't make ridges
  const S = P.map((p, i) => {
    let l = 0, r = 0, n = 0;
    for (let k = -2; k <= 2; k++) { const o = P[i + k]; if (o) { l += o[1]; r += o[2]; n++; } }
    return [p[0], l / n, r / n];
  });
  const pos = [], uv = [], idx = [];
  const cols = segs + 1;
  S.forEach(([y, L, R]) => {
    const xc = (L + R) / 2, rad = Math.max(0.5, (R - L) / 2);
    for (let j = 0; j <= segs; j++) {
      const ph = -Math.PI + (j / segs) * Math.PI * 2;
      const sx = Math.sin(ph), cz = Math.cos(ph);
      const px = xc + rad * sx;
      pos.push((px - bw / 2) * s, -(y - bh / 2) * s, rad * cz * depth * s);
      uv.push((bx + px) / SHEET, (by + y) / SHEET);
    }
  });
  for (let i = 0; i < S.length - 1; i++) for (let j = 0; j < segs; j++) {
    const a = i * cols + j, b = a + cols;
    idx.push(a, b, a + 1, a + 1, b, b + 1);
  }
  // caps
  [[0, 1], [S.length - 1, -1]].forEach(([ri, dir]) => {
    const [y, L, R] = S[ri], xc = (L + R) / 2;
    const c = pos.length / 3;
    pos.push((xc - bw / 2) * s, -(y - bh / 2) * s, 0);
    uv.push((bx + xc) / SHEET, (by + y) / SHEET);
    for (let j = 0; j < segs; j++) {
      const a = ri * cols + j;
      if (dir > 0) idx.push(c, a + 1, a); else idx.push(c, a, a + 1);
    }
  });
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return { geo: g, h: bh * s };
}

const sheetCache = new Map();
function loadSheet(f) {
  if (sheetCache.has(f.sheet)) return sheetCache.get(f.sheet);
  const p = new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = c.height = SHEET;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      res({ img, alpha: ctx.getImageData(0, 0, SHEET, SHEET).data });
    };
    img.onerror = rej;
    img.src = f.sheet;
  });
  sheetCache.set(f.sheet, p);
  return p;
}

let envTex = null;
function makeGL(slide) {
  const f = slide.f;
  const canvas = document.createElement('canvas');
  canvas.className = 'gl';
  slide.glLayer.appendChild(canvas);
  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { return null; }
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = SRGBColorSpace;
  const scene = new Scene();
  const pm = new PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  pm.dispose();
  scene.add(new HemisphereLight(0xffffff, 0xe8d8c8, 1.55));
  const key = new DirectionalLight(0xffffff, 1.35); key.position.set(-700, 900, 1400); scene.add(key);
  const rim = new DirectionalLight(0xffffff, 0.55); rim.position.set(900, 300, -300); scene.add(rim);
  const fill = new DirectionalLight(0xfff4ea, 0.35); fill.position.set(800, -200, 900); scene.add(fill);
  // camera that maps the 1440 x 900 design frame onto the z = 0 plane
  const fov = 16;
  const cam = new PerspectiveCamera(fov, 1440 / 900, 100, 20000);
  cam.position.set(0, 0, 450 / Math.tan((fov / 2) * Math.PI / 180));
  const cupG = new Group(), fruitG = new Group();
  scene.add(cupG, fruitG);
  const gl = { renderer, scene, cam, canvas, cupG, fruitG, pieces: [], bottle: null, ready: false };
  loadSheet(f).then(({ img, alpha }) => {
    const tex = new Texture(img);
    tex.flipY = false; tex.colorSpace = SRGBColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    tex.minFilter = LinearMipmapLinearFilter; tex.magFilter = LinearFilter;
    tex.needsUpdate = true;
    // bottle
    const b = buildSolid(alpha, f.boxes[0], f.cup.w, 1.0, 220, 96);
    const bm = new MeshPhysicalMaterial({ map: tex, roughness: 0.32, clearcoat: 0.55, clearcoatRoughness: 0.18, alphaTest: 0.5, side: DoubleSide });
    const bottle = new Mesh(b.geo, bm);
    const bx = f.cup.x + f.cup.w / 2, by = f.cup.y + b.h / 2;
    bottle.position.set(bx - 720, 450 - by, 0);
    cupG.add(bottle);
    gl.bottle = bottle;
    // sharp fruit
    f.pieces.forEach(([item, x, y, w, rot, mirror, layer]) => {
      if (layer !== 'fruit') return;
      const it = f.items[item - 1] || {};
      const sol = buildSolid(alpha, f.boxes[item], w, it.depth ?? 0.85, 90, 56);
      const m = new MeshStandardMaterial({ map: tex, roughness: it.rough ?? 0.5, metalness: 0, alphaTest: 0.5, side: DoubleSide });
      const mesh = new Mesh(sol.geo, m);
      const holder = new Group();
      holder.position.set(x + w / 2 - 720, 450 - (y + sol.h / 2), 40);
      if (mirror) holder.scale.x = -1;
      holder.add(mesh);
      fruitG.add(holder);
      gl.pieces.push({ holder, mesh, y0: holder.position.y, base: -rot * Math.PI / 180, dur: rnd(3.2, 5.0), ph: rnd(0, 4), sway: rnd(0.25, 0.42) * (Math.random() < 0.5 ? -1 : 1), swayDur: rnd(5.5, 8.5) });
    });
    gl.ready = true;
    sizeGL(gl);
  });
  return gl;
}
function sizeGL(gl) {
  if (!gl) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  gl.renderer.setPixelRatio(dpr);
  gl.renderer.setSize(Math.round(1440 * u), Math.round(900 * u), false);
}
let pointerX = 0, pointerY = 0, px = 0, py = 0;
addEventListener('pointermove', e => { pointerX = e.clientX / innerWidth * 2 - 1; pointerY = e.clientY / innerHeight * 2 - 1; });
function renderGL(slide, t) {
  const gl = slide.gl;
  if (!gl || !gl.ready) return;
  gl.cupG.position.x = (slide.off[2] || 0) / u;
  gl.fruitG.position.x = (slide.off[3] || 0) / u;
  const still = REDUCED;
  if (gl.bottle) {
    gl.bottle.rotation.y = still ? 0 : 0.22 * Math.sin(t / 7000 * Math.PI * 2) + px * 0.35;
    gl.bottle.rotation.x = still ? 0 : py * 0.08;
  }
  gl.pieces.forEach(p => {
    if (still) { p.holder.rotation.z = p.base; return; }
    const k = Math.cos(Math.PI * (t / 1000 + p.ph) / p.dur); // -1..1 like the alternate ease-in-out bob
    p.holder.position.y = p.y0 + 7 * k;
    p.holder.rotation.z = p.base + (3 * Math.PI / 180) * -k;
    p.mesh.rotation.y = p.sway * Math.sin((t / 1000 + p.ph) / p.swayDur * Math.PI * 2) + px * 0.25;
    p.mesh.rotation.x = py * 0.12;
  });
  gl.renderer.render(gl.scene, gl.cam);
}

/* ---------------- build DOM ---------------- */
const slides = FLAVOURS.map((f, i) => {
  const sec = document.createElement('section');
  sec.className = 'slide' + (i === 0 ? ' is-current' : '');
  sec.style.background = f.color;
  sec.setAttribute('aria-roledescription', 'slide');
  sec.setAttribute('aria-label', `${f.word} flavour`);
  if (i !== 0) sec.setAttribute('aria-hidden', 'true');
  const frame = document.createElement('div'); frame.className = 'frame';
  const mk = cls => { const d = document.createElement('div'); d.className = 'layer ' + cls; frame.appendChild(d); return d; };
  const L = { word: mk('word-layer'), shadow: mk('shadow-layer'), gl: mk('gl-layer'), corner: mk('corner') };
  const w = document.createElement('div'); w.className = 'word'; w.textContent = f.word; w.setAttribute('aria-hidden', 'true');
  L.word.appendChild(w);
  SHADOWS.forEach(([cx, cy, sw, sh]) => {
    const d = document.createElement('div'); d.className = 'shadow';
    Object.assign(d.style, { left: U(cx - sw / 2), top: U(cy - sh / 2), width: U(sw), height: U(sh) });
    L.shadow.appendChild(d);
  });
  const label = document.createElement('div'); label.className = 'sr';
  label.textContent = `Jogobella ${f.word} drinking yogurt with real fruit`; L.gl.appendChild(label);
  f.pieces.forEach(([item, x, y, pw, rot, mirror, layer]) => {
    if (layer !== 'corner') return;
    const o = document.createElement('div'); o.className = 'pc' + (mirror ? ' mirror' : '');
    const inner = document.createElement('div'); inner.className = 'pi crop';
    const ph = crop(inner, f.sheet, f.boxes[item], pw);
    Object.assign(o.style, { left: U(x), top: U(y), width: U(pw), height: U(ph) });
    inner.style.setProperty('--r', rot + 'deg');
    inner.style.setProperty('--d', rnd(3.2, 5.0).toFixed(2) + 's');
    inner.style.setProperty('--dl', (-rnd(0, 4)).toFixed(2) + 's');
    if (REDUCED) inner.style.animation = 'none';
    o.appendChild(inner); L.corner.appendChild(o);
  });
  sec.appendChild(frame); stage.appendChild(sec);
  const b = document.createElement('button');
  b.type = 'button'; b.textContent = f.tab || f.word;
  b.addEventListener('click', () => { touch(); if (i !== cur) go(i, i > cur ? 1 : -1); });
  tabsEl.insertBefore(b, ul);
  // the gl layer is moved through slide.off (cup = 2, fruit = 3) instead of a CSS transform
  return { el: sec, frame, word: w, layers: [L.word, L.shadow, null, null, L.corner], glLayer: L.gl, tab: b, f, off: [0, 0, 0, 0, 0], gl: null };
});

/* ---------------- layout ---------------- */
let u = 1, mobile = false;
const meas = document.createElement('canvas').getContext('2d');
function inkWidth100(text) {
  meas.font = '700 100px Poppins';
  const m = meas.measureText(text);
  return (m.actualBoundingBoxLeft || 0) + (m.actualBoundingBoxRight || m.width);
}
function layoutWords() {
  const visible = mobile ? Math.min(1440, innerWidth / u) * 0.92 : 1400;
  const limit = mobile ? visible : 1330;
  slides.forEach(s => {
    const text = s.f.word, n = Math.max(1, text.length - 1);
    const ink = inkWidth100(text) / 100;
    let F = 445, ls = 0.005;
    if ((ink + n * ls) * F > limit) { ls = -0.035; F = Math.min(445, visible / (ink + n * ls)); }
    const baseline = 403.5 + 0.698 * F / 2;
    s.word.style.fontSize = U(F);
    s.word.style.letterSpacing = ls + 'em';
    s.word.style.top = U(baseline - 0.85 * F);
  });
}
function layout() {
  const W = innerWidth, H = innerHeight;
  mobile = W <= 820 || H > W;
  u = mobile ? Math.min(W / 640, (H - 200) / 620) : Math.min(W / 1440, H / 900);
  root.style.setProperty('--u', u + 'px');
  root.style.setProperty('--fy', (mobile ? 8 : 0) + 'px');
  layoutWords();
  placeUnderline(true);
  slides.forEach(s => sizeGL(s.gl));
}
function placeUnderline(instant) {
  const t = slides[target].tab;
  if (instant || REDUCED) ul.style.transition = 'none';
  ul.style.width = t.offsetWidth + 'px';
  ul.style.transform = `translate(${t.offsetLeft}px, ${t.offsetTop + t.offsetHeight + 2}px)`;
  if (instant || REDUCED) { void ul.offsetWidth; ul.style.transition = ''; }
}
function setTab(i) {
  target = i;
  slides.forEach((s, k) => s.tab.setAttribute('aria-current', k === i ? 'true' : 'false'));
  placeUnderline(false);
}

/* ---------------- transitions ---------------- */
let cur = 0, target = 0, busy = false, moving = null;
function setX(s, xs) {
  s.layers.forEach((l, i) => { if (l) l.style.transform = xs[i] ? `translate3d(${xs[i]}px,0,0)` : ''; });
  s.off = xs.slice();
}
function ensureGL(s) { if (!s.gl) s.gl = makeGL(s); }
function finish(to) {
  slides.forEach((s, k) => {
    s.el.style.clipPath = ''; s.el.style.zIndex = ''; s.el.style.visibility = '';
    setX(s, [0, 0, 0, 0, 0]);
    s.el.classList.toggle('is-current', k === to);
    if (k === to) s.el.removeAttribute('aria-hidden'); else s.el.setAttribute('aria-hidden', 'true');
  });
  document.body.style.background = slides[to].f.color;
  cur = to; busy = false; moving = null;
  ensureGL(slides[(to + 1) % slides.length]);
}
function go(to, dir) {
  if (busy || to === cur) return;
  busy = true;
  setTab(to);
  ensureGL(slides[to]);
  if (REDUCED) { finish(to); return; }
  const A = slides[cur], B = slides[to];
  moving = [A, B];
  B.el.style.visibility = 'visible'; B.el.style.zIndex = '1';
  A.el.style.zIndex = '2';
  const fw = 1440 * u;
  setX(B, FACTORS.map(f => dir * f * fw));
  const t0 = performance.now();
  const step = now => {
    const t = (now - t0) / DUR;
    const c = cover(Math.min(t, 1));
    A.el.style.clipPath = dir > 0 ? `inset(0 ${c * 100}% 0 0)` : `inset(0 0 0 ${c * 100}%)`;
    setX(A, FACTORS.map(() => -dir * c * 0.14 * fw));
    const k = easeOutQuad(clamp01((t - 0.5) / 0.42));
    setX(B, FACTORS.map(f => dir * (1 - k) * f * fw));
    if (t >= 1 && k >= 1) finish(to); else requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
const next = () => go((cur + 1) % slides.length, 1);
const prev = () => go((cur - 1 + slides.length) % slides.length, -1);

/* ---------------- render loop ---------------- */
function loop(now) {
  px += (pointerX - px) * 0.05; py += (pointerY - py) * 0.05;
  const vis = moving || [slides[cur]];
  vis.forEach(s => renderGL(s, now));
  requestAnimationFrame(loop);
}

/* ---------------- controls ---------------- */
let lastTouch = -Infinity;
function touch() { lastTouch = performance.now(); }
document.getElementById('next').addEventListener('click', () => { touch(); next(); });
document.getElementById('prev').addEventListener('click', () => { touch(); prev(); });
addEventListener('keydown', e => {
  if (e.key === 'ArrowRight') { touch(); next(); } else if (e.key === 'ArrowLeft') { touch(); prev(); }
});
let sx = null, sy = 0;
stage.addEventListener('pointerdown', e => { sx = e.clientX; sy = e.clientY; });
addEventListener('pointerup', e => {
  if (sx === null) return;
  const dx = e.clientX - sx, dy = e.clientY - sy; sx = null;
  if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) { touch(); dx < 0 ? next() : prev(); }
});
addEventListener('pointercancel', () => { sx = null; });
setInterval(() => {
  if (document.visibilityState === 'visible' && performance.now() - lastTouch > 6000 && !busy) next();
}, 2600);
addEventListener('resize', layout);

/* ---------------- opening sequence ---------------- */
setTab(0);
layout();
ensureGL(slides[0]);
requestAnimationFrame(loop);
let revealed = false;
function reveal() {
  if (revealed) return; revealed = true;
  layout();
  document.body.classList.remove('is-pre');
  // warm up the rest so the first wipes don't hitch
  slides.forEach((s, k) => setTimeout(() => ensureGL(s), 400 + k * 250));
  if (REDUCED || !Element.prototype.animate) return;
  const fw = 1440 * u;
  const A = slides[0];
  const t0 = performance.now();
  const ease = t => { // cubic-bezier(0.22, 0.8, 0.3, 1) approximation
    let lo = 0, hi = 1, x;
    for (let i = 0; i < 20; i++) { x = (lo + hi) / 2; const bx = 3 * (1 - x) * (1 - x) * x * 0.22 + 3 * (1 - x) * x * x * 0.3 + x * x * x; if (bx < t) lo = x; else hi = x; }
    return 3 * (1 - x) * (1 - x) * x * 0.8 + 3 * (1 - x) * x * x + x * x * x;
  };
  busy = true;
  const intro = now => {
    const t = Math.min(1, (now - t0) / 900), k = ease(t);
    setX(A, FACTORS.map(f => (1 - k) * f * fw));
    if (t < 1) requestAnimationFrame(intro); else { setX(A, [0, 0, 0, 0, 0]); busy = false; }
  };
  requestAnimationFrame(intro);
  A.frame.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250, easing: 'linear' });
  document.querySelectorAll('.rise').forEach(el => {
    el.animate([{ opacity: 0, translate: '0 14px' }, { opacity: 1, translate: '0 0' }],
      { duration: 1000, delay: +el.dataset.rise, easing: 'cubic-bezier(0.22, 0.8, 0.3, 1)', fill: 'backwards' });
  });
}
(document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(reveal);
setTimeout(reveal, 3000);
