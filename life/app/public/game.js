// Claude Life: pixel room + HUD. Reads /api/state every few seconds.
(() => {
  const W = 320, H = 180;
  const $ = (id) => document.getElementById(id);
  const cvs = $('room'), ctx = cvs.getContext('2d'), fx = $('fx'), bubble = $('bubble');
  cvs.width = W; cvs.height = H; ctx.imageSmoothingEnabled = false;
  const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- activities ----------
  const ST = { desk: { x: 72, y: 150 }, shelf: { x: 148, y: 150 }, mail: { x: 198, y: 150 }, center: { x: 165, y: 163 }, bed: { x: 238, y: 156 } };
  const ACT = {
    research:  { st: 'shelf',  icon: '🔍', fx: ['🔍', '📖', '?', '!'] },
    build:     { st: 'desk',   icon: '💻', fx: ['</>', '{ }', '✨', '<div>'] },
    email:     { st: 'mail',   icon: '✉️', fx: ['✉️', '📨'] },
    think:     { st: 'center', icon: '💭', fx: ['💡', '🤔', '?'] },
    waiting:   { st: 'center', icon: '❗', fx: ['👋'] },
    celebrate: { st: 'center', icon: '🎉', fx: ['💰', '🎉', '+$'] },
    sleep:     { st: 'bed',    icon: '💤', fx: ['z', 'Z', 'z'] },
    idle:      { st: null,     icon: '🙂', fx: [] },
  };
  const ALIAS = { writing: 'build', write: 'build', code: 'build', translating: 'build', translate: 'build', designing: 'build', submit: 'email', applying: 'email', pitching: 'email', reviewing: 'think', researching: 'research', building: 'build', coding: 'build', emailing: 'email', outreach: 'email', planning: 'think', thinking: 'think', waiting_operator: 'waiting', needs_operator: 'waiting', sleeping: 'sleep', sale: 'celebrate' };
  const norm = (t) => { t = String(t || 'idle').toLowerCase(); t = ALIAS[t] || t; return ACT[t] ? t : 'idle'; };

  const DEMO = [
    ['think', 'Reviewing bets: which one is paying off?'],
    ['research', 'Hunting paid GitHub bounties that fit my skills'],
    ['build', 'Fixing a bug for a $150 open-source bounty'],
    ['waiting', 'Waiting for you to approve a demo site'],
    ['email', 'Sending a pitch to a barbershop in Austin'],
    ['celebrate', 'Bounty paid! +$150'],
    ['sleep', 'Out of usage. Sleeping until it resets'],
  ];

  // ---------- state ----------
  let state = null, lastJSON = '', live = false, demo = false, demoIdx = 0, demoT = 0;
  let override = null; // {type,label,until}
  const me = { x: 165, y: 163, face: 1, walking: false, inBed: false };
  let wander = null, wanderT = 0, fxT = 1, t = 0, particles = [];

  function current() {
    if (demo) return { type: DEMO[demoIdx][0], label: DEMO[demoIdx][1] };
    if (override && performance.now() < override.until) return override;
    const a = state?.activity || {};
    return { type: norm(a.type), label: a.label || '', since: a.since };
  }

  // ---------- room ----------
  const BOOKS = (() => {
    let s = 11; const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    const cols = ['#c94f4f', '#4f7fc9', '#e0b44a', '#5aa36b', '#9b5fc0', '#e07a55', '#3e8f8f'];
    const out = [];
    for (const base of [79, 99, 119, 139]) {
      let x = 131;
      while (x < 164) {
        const w = 2 + Math.floor(r() * 3), h = 9 + Math.floor(r() * 8);
        if (r() < 0.12) { x += 3; continue; }
        out.push({ x, y: base - h, w: Math.min(w, 165 - x), h, c: cols[Math.floor(r() * cols.length)] });
        x += w;
      }
    }
    return out;
  })();
  const STARS = Array.from({ length: 14 }, () => ({ x: 188 + Math.random() * 40, y: 28 + Math.random() * 40 }));

  function hourNow() { const d = new Date(); return d.getHours() + d.getMinutes() / 60; }
  function skyColor(h) {
    if (h < 5.5 || h >= 20.5) return '#1d2350';
    if (h < 7) return '#f2a37a';
    if (h < 18) return '#8fd3ff';
    return '#f08a6a';
  }

  function drawRoom(a) {
    const h = hourNow(), sleeping = a.type === 'sleep';
    // wall
    R(0, 0, W, 110, '#e9dcc7');
    for (let x = 0; x < W; x += 16) R(x, 0, 8, 106, '#e3d4bd');
    R(0, 102, W, 8, '#b89f80'); R(0, 102, W, 1, '#cbb495');
    // floor
    R(0, 110, W, 70, '#8a5a3c');
    for (let y = 110; y < H; y += 7) { R(0, y, W, 1, '#734a31'); for (let x = (y / 7 % 2) * 20; x < W; x += 40) R(x, y, 1, 7, '#734a31'); }
    // rug
    for (let i = 0; i < 18; i++) { const w = 90 - Math.abs(i - 9) ** 2 * 0.9; R(165 - w / 2, 152 + i, w, 1, i === 0 || i === 17 ? '#7c2f3d' : (i % 4 ? '#b5485a' : '#c95e70')); }

    // poster: chart going up
    R(22, 26, 32, 28, '#3a3150'); R(24, 28, 28, 24, '#fdf8ee');
    const pts = [[26, 48], [32, 44], [37, 46], [43, 38], [49, 31]];
    for (let i = 0; i < pts.length - 1; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[i + 1]; for (let k = 0; k <= 10; k++) R(x1 + (x2 - x1) * k / 10, y1 + (y2 - y1) * k / 10, 1, 1, '#2f9a55'); }
    R(48, 30, 3, 3, '#2f9a55');

    // window
    R(184, 24, 48, 48, '#5a3a22'); R(186, 26, 44, 44, skyColor(h));
    if (h < 5.5 || h >= 20.5) { STARS.forEach((s, i) => { if ((Math.floor(t * 2) + i) % 5) R(s.x, s.y, 1, 1, '#fff'); }); R(218, 31, 6, 8, '#fdf3c4'); R(217, 32, 8, 6, '#fdf3c4'); R(221, 31, 4, 6, skyColor(h)); R(222, 37, 3, 1, skyColor(h)); }
    else { R(214, 32, 8, 8, '#ffe066'); R(192 + (t * 3) % 50 - 10, 50, 12, 3, '#ffffffcc'); R(195 + (t * 3) % 50 - 10, 48, 6, 2, '#ffffffcc'); }
    R(207, 26, 2, 44, '#5a3a22'); R(186, 47, 44, 2, '#5a3a22');
    R(180, 22, 6, 54, '#d97757'); R(230, 22, 6, 54, '#d97757'); R(178, 20, 60, 3, '#6b4226');

    // bookshelf
    R(128, 58, 40, 86, '#5a3a22'); R(130, 60, 36, 80, '#3d2716');
    BOOKS.forEach((b) => { R(b.x, b.y, b.w, b.h, b.c); R(b.x, b.y + 2, b.w, 1, '#00000030'); });
    for (const y of [79, 99, 119, 139]) R(130, y, 36, 2, '#6b4226');
    R(150, 54, 10, 4, '#5aa36b'); R(153, 50, 4, 4, '#5aa36b');

    // coin jar: fill = progress to next milestone
    const p = progress();
    R(174, 126, 14, 16, '#cfe8ff55'); R(173, 126, 1, 16, '#ffffff88'); R(188, 126, 1, 16, '#ffffff88'); R(173, 141, 16, 1, '#ffffff88');
    const fh = Math.round(14 * p); if (fh) R(175, 141 - fh, 12, fh, '#ffc857');
    R(175, 123, 12, 3, '#8a6a3c');

    // plant
    R(110, 132, 12, 10, '#b5643a'); R(111, 132, 10, 2, '#cf7a4c');
    const sway = Math.sin(t * 1.5) > 0 ? 1 : 0;
    R(112 + sway, 120, 3, 12, '#3f8f55'); R(117, 117 - sway, 3, 15, '#4fa866'); R(108, 124, 5, 3, '#3f8f55'); R(119, 122 + sway, 6, 3, '#4fa866');

    // desk + monitor
    R(40, 110, 64, 4, '#7a4c2c'); R(42, 114, 60, 10, '#5e3a21'); R(44, 124, 4, 18, '#4a2d19'); R(96, 124, 4, 18, '#4a2d19');
    R(70, 104, 5, 6, '#2b2b33'); R(64, 108, 17, 2, '#2b2b33');
    R(55, 82, 35, 23, '#2b2b33');
    drawScreen(a, sleeping);
    // desk lamp
    R(94, 108, 6, 2, '#333'); R(96, 98, 2, 10, '#333'); R(92, 95, 8, 4, '#e0b44a');
    // mug
    R(46, 105, 5, 5, '#fdf8ee'); R(51, 106, 2, 3, '#fdf8ee');
    if (!sleeping && Math.floor(t * 2) % 2) R(48, 101, 1, 3, '#ffffff70');

    // mailbox
    R(211, 110, 3, 32, '#4a2d19');
    R(202, 96, 22, 14, '#4f7fc9'); R(202, 96, 22, 3, '#6c9ae0'); R(204, 102, 8, 2, '#2c4f86');
    const flagUp = a.type === 'email';
    if (flagUp) { R(224, 88, 2, 12, '#888'); R(226, 88, 6, 4, '#e04f4f'); } else { R(224, 102, 8, 2, '#e04f4f'); }

    // bed
    R(300, 96, 8, 46, '#6b4226'); R(242, 132, 4, 10, '#4a2d19'); R(298, 132, 4, 10, '#4a2d19');
    R(242, 124, 60, 10, '#7a4c2c'); R(244, 118, 56, 7, '#f4efe6');
    R(284, 112, 15, 8, '#fff'); R(284, 119, 15, 1, '#d8d0c4');
  }

  function drawScreen(a, sleeping) {
    if (sleeping) { R(57, 84, 31, 19, '#0d0d12'); return; }
    if (a.type === 'build' && atStation()) {
      R(57, 84, 31, 19, '#141a2a');
      const cols = ['#9ef0b4', '#6cb4ff', '#ffc857', '#e07a55', '#d6c9ef'];
      const off = Math.floor(t * 6);
      for (let i = 0; i < 7; i++) { const n = i + off; const w = 4 + (n * 37 % 19); R(59 + (n % 3) * 2, 86 + i * 2.5, Math.min(w, 26), 1, cols[n % cols.length]); }
      if (Math.floor(t * 3) % 2) R(80, 101, 2, 1, '#fff');
    } else if (a.type === 'email' || a.type === 'waiting') {
      R(57, 84, 31, 19, '#eef3ff'); R(57, 84, 31, 3, '#4f7fc9');
      R(60, 90, 25, 1, '#c3cbe0'); R(60, 93, 18, 1, '#c3cbe0'); R(60, 96, 22, 1, '#c3cbe0');
      if (a.type === 'waiting' && Math.floor(t * 2) % 2) R(83, 88, 3, 3, '#e04f4f');
    } else {
      R(57, 84, 31, 19, '#1f2a44');
      [6, 10, 7, 13, 11].forEach((hh, i) => R(60 + i * 5, 101 - hh, 3, hh, i === 4 ? '#ffc857' : '#6cb4ff'));
    }
  }

  // ---------- character ----------
  const C = { skin: '#f2c29b', hair: '#4a3426', shirt: '#e07a55', shirtD: '#b85f42', pants: '#3d4a6b', shoe: '#26222e' };

  function drawChar(a) {
    if (me.inBed) {
      // head on pillow, blanket over body
      R(287, 108, 8, 8, C.skin); R(287, 107, 8, 3, C.hair); R(294, 108, 1, 6, C.hair);
      R(289, 113, 2, 1, '#5a3a2a'); R(292, 113, 2, 1, '#5a3a2a');
      const breathe = Math.sin(t * 2) > 0 ? 1 : 0;
      R(246, 116 - breathe, 40, 10 + breathe, '#6c8ebf'); R(246, 116 - breathe, 40, 2, '#8eaee0');
      for (let x = 250; x < 284; x += 8) R(x, 120, 4, 4, '#5a7aa8');
      return;
    }
    const x = Math.round(me.x), arrived = !me.walking;
    let y = Math.round(me.y);
    const pose = me.walking ? 'walk' : ({ build: 'type', research: 'read', email: 'post', think: 'think', waiting: 'wave', celebrate: 'cheer' }[a.type] || 'stand');
    if (pose === 'cheer') y -= Math.abs(Math.sin(t * 7)) * 6 | 0;
    // shadow
    ctx.fillStyle = '#00000035'; ctx.beginPath(); ctx.ellipse(me.x, me.y, 6, 2, 0, 0, Math.PI * 2); ctx.fill();
    const f = Math.floor(t * 8) % 2;
    // legs
    const lL = pose === 'walk' && f ? 2 : 0, lR = pose === 'walk' && !f ? 2 : 0;
    R(x - 3, y - 6, 2, 6 - lL, C.pants); R(x + 1, y - 6, 2, 6 - lR, C.pants);
    R(x - 3, y - 1 - lL, 2, 1, C.shoe); R(x + 1, y - 1 - lR, 2, 1, C.shoe);
    // body
    R(x - 4, y - 14, 8, 8, C.shirt); R(x - 4, y - 8, 8, 1, C.shirtD);
    const back = pose === 'type';
    // arms
    const arm = (ax, ay, w, h) => { R(ax, ay, w, h, C.shirt); };
    if (pose === 'type') { const k = Math.floor(t * 10) % 2; arm(x - 6, y - 14, 2, 4 - k); arm(x + 4, y - 14, 2, 3 + k); }
    else if (pose === 'cheer') { arm(x - 6, y - 20, 2, 7); arm(x + 4, y - 20, 2, 7); R(x - 6, y - 21, 2, 1, C.skin); R(x + 4, y - 21, 2, 1, C.skin); }
    else if (pose === 'wave') { arm(x - 6, y - 14, 2, 6); const k = Math.floor(t * 4) % 2; arm(x + 4 + k, y - 20, 2, 7); R(x + 4 + k, y - 21, 2, 2, C.skin); }
    else if (pose === 'post') { arm(x - 6, y - 14, 2, 6); arm(x + 4, y - 15, 6, 2); R(x + 10, y - 15, 2, 2, C.skin); }
    else if (pose === 'think') { arm(x - 6, y - 14, 2, 6); arm(x + 2, y - 13, 3, 2); R(x + 1, y - 15, 2, 2, C.skin); }
    else if (pose === 'read') { R(x - 5, y - 13, 10, 6, '#4f7fc9'); R(x - 4, y - 12, 4, 4, '#fdf8ee'); R(x + 1, y - 12, 3, 4, '#fdf8ee'); R(x - 6, y - 12, 2, 3, C.skin); R(x + 4, y - 12, 2, 3, C.skin); }
    else { const sw = pose === 'walk' ? (f ? 1 : -1) : 0; arm(x - 6, y - 14 + sw, 2, 6); arm(x + 4, y - 14 - sw, 2, 6); R(x - 6, y - 8 + sw, 2, 1, C.skin); R(x + 4, y - 8 - sw, 2, 1, C.skin); }
    // head
    if (back) { R(x - 4, y - 23, 8, 9, C.hair); R(x - 5, y - 19, 1, 2, C.skin); R(x + 4, y - 19, 1, 2, C.skin); }
    else {
      R(x - 4, y - 22, 8, 8, C.skin); R(x - 4, y - 23, 8, 3, C.hair); R(x - 4, y - 21, 1, 3, C.hair); R(x + 3, y - 21, 1, 3, C.hair);
      const blink = (t % 4) < 0.12;
      const ex = pose === 'walk' || pose === 'post' ? me.face : 0;
      if (blink) { R(x - 2 + ex, y - 18, 1, 1, '#5a3a2a'); R(x + 1 + ex, y - 18, 1, 1, '#5a3a2a'); }
      else { R(x - 2 + ex, y - 19, 1, 2, '#2a1a12'); R(x + 1 + ex, y - 19, 1, 2, '#2a1a12'); }
      if (pose === 'cheer') R(x - 1 + ex, y - 16, 3, 1, '#a03a3a');
      R(x - 3 + ex, y - 17, 1, 1, '#f0a08a'); R(x + 2 + ex, y - 17, 1, 1, '#f0a08a');
    }
    void arrived;
  }

  function atStation() { return !me.walking; }

  // ---------- fx ----------
  function floater(text, lx, ly, cls = '') {
    const d = document.createElement('div');
    d.className = 'floater ' + cls; d.textContent = text;
    d.style.left = (lx / W * 100) + '%'; d.style.top = (ly / H * 100) + '%';
    d.style.setProperty('--dx', rand(-14, 14) + 'px');
    fx.appendChild(d); setTimeout(() => d.remove(), 1900);
  }
  function confetti(n = 40) {
    const cols = ['#ffc857', '#e07a55', '#6fdc8c', '#6cb4ff', '#ff6b7a', '#d6a6ff'];
    for (let i = 0; i < n; i++) particles.push({ k: 'c', x: me.x, y: me.y - 18, vx: rand(-60, 60), vy: rand(-90, -30), life: rand(1.2, 2.2), c: pick(cols) });
  }
  function envelope() { particles.push({ k: 'e', x: 210, y: 98, vx: rand(-25, -10), vy: rand(-28, -18), life: 2.4 }); }

  function spawnFx(a) {
    const def = ACT[a.type]; if (!def.fx.length || me.walking) return;
    const txt = pick(def.fx);
    if (a.type === 'build') floater(txt, rand(60, 86), 82, 'code');
    else if (a.type === 'sleep') floater(txt, 296, 104, 'z');
    else if (a.type === 'email') { envelope(); floater(txt, 212, 90); }
    else if (a.type === 'celebrate') { confetti(18); floater(txt, me.x, me.y - 30, 'gold'); }
    else floater(txt, me.x + rand(-6, 6), me.y - 30);
  }

  function stepParticles(dt) {
    particles = particles.filter((p) => (p.life -= dt) > 0);
    for (const p of particles) {
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.k === 'c') { p.vy += 120 * dt; R(p.x, p.y, 2, 2, p.c); }
      else { const wob = Math.sin(p.life * 6); R(p.x, p.y + wob, 7, 5, '#fff'); R(p.x, p.y + wob, 7, 1, '#d8d0c4'); R(p.x + 1, p.y + 1 + wob, 2, 1, '#e04f4f'); R(p.x + 3, p.y + 2 + wob, 1, 1, '#b8b0a4'); R(p.x + 5, p.y + 1 + wob, 2, 1, '#b8b0a4'); }
    }
  }

  // ---------- loop ----------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    if (demo) { demoT += dt; if (demoT > 7) { demoT = 0; demoIdx = (demoIdx + 1) % DEMO.length; if (DEMO[demoIdx][0] === 'celebrate') setTimeout(() => confetti(50), 900); } }
    const a = current();
    const def = ACT[a.type];

    // movement
    if (me.inBed && a.type !== 'sleep') { me.inBed = false; me.x = ST.bed.x; me.y = ST.bed.y; }
    if (!me.inBed) {
      let tgt = def.st ? ST[def.st] : null;
      if (!tgt) { wanderT -= dt; if (!wander || wanderT <= 0) { wander = { x: rand(60, 230), y: rand(148, 170) }; wanderT = rand(3, 7); } tgt = wander; }
      const dx = tgt.x - me.x, dy = tgt.y - me.y, d = Math.hypot(dx, dy);
      if (d > 1) { const sp = Math.min(48 * dt, d); me.x += dx / d * sp; me.y += dy / d * sp; me.walking = true; if (Math.abs(dx) > 0.5) me.face = Math.sign(dx); }
      else { me.walking = false; if (a.type === 'sleep') me.inBed = true; }
    }

    drawRoom(a);
    drawChar(a);
    stepParticles(dt);
    // lighting
    const h = hourNow(), night = h < 6 || h >= 20;
    if (a.type === 'sleep') { R(0, 0, W, H, '#0a0a2a90'); R(186, 26, 44, 44, '#1d235040'); }
    else if (night) { ctx.fillStyle = '#0a0a2a40'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#ffe08a22'; ctx.beginPath(); ctx.moveTo(92, 99); ctx.lineTo(100, 99); ctx.lineTo(120, 142); ctx.lineTo(60, 142); ctx.fill(); }

    fxT -= dt; if (fxT <= 0) { spawnFx(a); fxT = a.type === 'sleep' ? 1.2 : rand(1, 1.8); }

    // bubble follows head
    const bx = me.inBed ? 291 : me.x, by = me.inBed ? 100 : me.y - 27 - (a.type === 'celebrate' ? 4 : 0);
    bubble.style.left = (bx / W * 100) + '%'; bubble.style.top = (by / H * 100) + '%';
    if (bubble.dataset.i !== def.icon) { bubble.textContent = def.icon; bubble.dataset.i = def.icon; }

    document.body.classList.toggle('sleeping', a.type === 'sleep');
    $('nowText').textContent = (!demo && state?.activity?.bet ? '[' + state.activity.bet + '] ' : '') + (a.label || a.type) + (demo ? '  (preview)' : '');
    requestAnimationFrame(frame);
  }

  // ---------- numbers ----------
  function milestones(b) { let m = 50; while (m <= b) m *= 2; return { next: m, prev: m === 50 ? 0 : m / 2 }; }
  function progress() { const b = state?.balance || 0, { next, prev } = milestones(b); return Math.max(0, Math.min(1, (b - prev) / (next - prev))); }
  const money = (n) => (n < 0 ? '-' : '') + '$' + Math.abs(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  function ago(iso) {
    if (!iso) return ''; const s = (Date.now() - new Date(iso)) / 1000; if (isNaN(s)) return '';
    if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + 'm ago'; if (s < 86400) return Math.floor(s / 3600) + 'h ago'; return Math.floor(s / 86400) + 'd ago';
  }
  function toast(msg) { const el = $('toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 3500); }

  // ---------- panels ----------
  function render(s, prev) {
    $('name').textContent = s.name || 'Claude';
    $('day').textContent = s.day ?? 0;
    const lives = Math.max(0, s.lives | 0);
    $('lives').innerHTML = Array.from({ length: lives }, () => '<span class="h">❤️</span>').join('') + '<span class="h empty" title="Next life">❤️</span>';
    $('balance').textContent = money(s.balance);
    $('energyBar').style.width = Math.max(0, Math.min(100, s.energy ?? 100)) + '%';
    const { next } = milestones(s.balance || 0);
    $('xpLabel').textContent = `Next life at ${money(next).replace('.00', '')}`;
    $('xpBar').style.width = progress() * 100 + '%';
    $('nowSince').textContent = s.activity?.since ? 'since ' + ago(s.activity.since) : '';

    const st = s.stats || {};
    const doing = s.doing || [];
    $('tab-quests').innerHTML = `
      <div class="kpis">
        <div><b>${money(st.earned || 0)}</b><span>earned</span></div>
        <div><b>${st.tasks_done || 0}</b><span>tasks done</span></div>
        <div><b>${(s.bets || []).filter((b) => b.status === 'active').length}</b><span>active bets</span></div>
      </div>
      <h3>Doing now</h3>
      ${doing.map((d) => `<div class="doing"><span class="dot ${esc(d.status || 'working')}"></span><div><div>${esc(d.task)}</div><small>${esc(d.bet || '')}${d.status ? ' · ' + esc(d.status) : ''}</small></div></div>`).join('') || '<div class="empty">Nothing in progress.</div>'}
      <h3>Bets</h3>
      ${(s.bets || []).map((b) => `<div class="card"><div class="row"><span class="title">${esc(b.name)}</span><span class="chip ${esc(b.status)}">${esc(b.status)}</span></div><p>${esc(b.note)}</p>
        ${(b.metrics || []).length ? `<div class="metrics">${b.metrics.map((m) => `<span><b>${esc(m.value)}</b> ${esc(m.label)}</span>`).join('')}</div>` : ''}
        ${b.earned ? `<p class="earned">💰 ${money(b.earned)} earned</p>` : ''}</div>`).join('') || '<div class="empty">No bets yet.</div>'}`;

    const pending = (s.review || []).filter((r) => (r.status || 'pending') === 'pending');
    $('reviewBadge').textContent = pending.length + (s.needs || []).length || '';
    const sorted = [...(s.review || [])].sort((a, b) => ((a.status || 'pending') === 'pending' ? -1 : 0) - ((b.status || 'pending') === 'pending' ? -1 : 0));
    $('tab-review').innerHTML = `
      ${(s.needs || []).length ? '<h3>Claude needs you</h3>' + s.needs.map((n) => `<div class="need"><span>🙋</span><span>${esc(n)}</span></div>`).join('') : ''}
      <h3>Approval queue</h3>
      ${sorted.map((r) => {
        const st = r.status || 'pending';
        return `<div class="card" data-id="${esc(r.id)}">
          <div class="row"><span class="title">${esc(r.title)}</span><span class="chip ${esc(st)}">${esc(st)}</span></div>
          <p>${esc(r.kind || 'item')}${r.target ? ' · ' + esc(r.target) : ''}</p>
          ${r.url ? `<p><a href="${esc(r.url)}" target="_blank" rel="noopener">Open preview ↗</a></p>` : ''}
          ${r.email ? `<details><summary>Email draft</summary><pre>${esc(r.email)}</pre></details>` : ''}
          ${st === 'pending' ? `<textarea placeholder="Note for Claude (optional)"></textarea>
          <div class="review-actions"><button class="btn ok" data-d="approved">✓ Approve</button><button class="btn warn" data-d="changes">✎ Changes</button><button class="btn no" data-d="rejected">✕ Reject</button></div>`
          : r.note ? `<p>Your note: ${esc(r.note)}</p>` : ''}
        </div>`;
      }).join('') || '<div class="empty">Nothing to approve yet. Demos and emails show up here before they go out.</div>'}`;

    $('tab-journal').innerHTML = `<ul class="log">${(s.log || []).map((l) => `<li>${esc(l.text)}<time>${l.t ? new Date(l.t).toLocaleString() : ''}</time></li>`).join('') || '<li class="empty">No entries yet.</li>'}</ul>`;

    $('tab-wallet').innerHTML = `
      <h3>Balance</h3><div class="big">${money(s.balance)}</div>
      <div class="bar xp"><i style="width:${progress() * 100}%"></i></div>
      <p class="empty">${money(next - (s.balance || 0))} to the next life</p>
      <h3>Transactions</h3>
      <table>${[...(s.transactions || [])].reverse().map((x) => `<tr><td>${esc(x.description)}<br><small class="empty">${esc(x.date)}</small></td><td class="amt ${x.amount > 0 ? 'pos' : x.amount < 0 ? 'neg' : ''}">${x.amount > 0 ? '+' : ''}${money(x.amount)}</td></tr>`).join('')}</table>`;

    // events
    if (prev) {
      if ((s.balance || 0) > (prev.balance || 0)) {
        const gain = s.balance - prev.balance;
        override = { type: 'celebrate', label: `Earned ${money(gain)}!`, until: performance.now() + 8000 };
        setTimeout(() => { confetti(60); floater('+' + money(gain), me.x, me.y - 34, 'gold'); }, 400);
        $('balance').parentElement.classList.remove('bump'); void $('balance').offsetWidth; $('balance').parentElement.classList.add('bump');
        toast(`💰 +${money(gain)}`);
      }
      if ((s.lives | 0) > (prev.lives | 0)) toast('❤️ New life unlocked!');
      if ((s.lives | 0) < (prev.lives | 0)) toast('💔 Lost a life');
      if (pending.length > (prev.review || []).filter((r) => (r.status || 'pending') === 'pending').length) toast('📝 New item waiting for your review');
    }
  }

  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-d]'); if (!b) return;
    const card = b.closest('[data-id]');
    if (!live) return toast('Offline: start the server to approve');
    try {
      const res = await fetch('/api/review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: card.dataset.id, decision: b.dataset.d, note: card.querySelector('textarea')?.value || '' }) });
      if (!res.ok) throw new Error();
      apply(await res.json());
      toast(b.dataset.d === 'approved' ? '✓ Approved' : b.dataset.d === 'changes' ? '✎ Sent back for changes' : '✕ Rejected');
    } catch { toast('Could not save that decision'); }
  });

  document.querySelectorAll('.tabs button').forEach((btn) => btn.addEventListener('click', () => showTab(btn.dataset.tab)));
  function showTab(name) {
    document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === name));
    document.querySelectorAll('.tab').forEach((t) => { t.hidden = t.id !== 'tab-' + name; });
    try { localStorage.setItem('cl-tab', name); } catch {}
  }
  try { const saved = localStorage.getItem('cl-tab'); if (saved) showTab(saved); } catch {}

  $('demoBtn').addEventListener('click', () => {
    demo = !demo; demoIdx = 0; demoT = 0;
    $('demoBtn').classList.toggle('on', demo);
    $('demoBtn').textContent = demo ? '■ Stop preview' : '▶ Preview animations';
  });

  function apply(s) {
    const j = JSON.stringify(s);
    if (j === lastJSON) return;
    const prev = state; state = s; lastJSON = j;
    const active = document.activeElement;
    if (active && active.tagName === 'TEXTAREA' && prev) return; // don't wipe a note being typed
    render(s, prev);
  }

  const FALLBACK = { name: 'Claude', day: 0, balance: 0, lives: 1, energy: 100, activity: { type: 'idle', label: 'Offline: run start-claude-life to connect' }, stats: {}, doing: [], bets: [], needs: [], review: [], transactions: [], log: [] };
  async function poll() {
    try {
      const r = await fetch('/api/state', { cache: 'no-store' });
      if (!r.ok) throw new Error();
      apply(await r.json());
      live = true; $('conn').textContent = 'Live'; $('conn').className = 'conn live';
    } catch {
      live = false; $('conn').textContent = 'Offline: start the server'; $('conn').className = 'conn off';
      if (!state) apply(FALLBACK);
    }
  }
  setInterval(() => { const d = new Date(); $('clock').textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }, 1000);
  setInterval(poll, 3000); setInterval(() => state && ($('nowSince').textContent = state.activity?.since ? 'since ' + ago(state.activity.since) : ''), 30000);
  poll();
  requestAnimationFrame(frame);
})();
