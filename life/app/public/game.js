// Claude Life: pixel house + HUD. Reads /api/state every few seconds.
(() => {
  const OX = 60, W = 460, H = 180; // world x runs from -OX (kitchen) to 400 (bed)
  const $ = (id) => document.getElementById(id);
  const cvs = $('room'), ctx = cvs.getContext('2d'), fx = $('fx'), bubble = $('bubble'), chatter = $('chatter');
  cvs.width = W; cvs.height = H; ctx.imageSmoothingEnabled = false;
  const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const pickNew = (a, prev) => { const f = a.filter((x) => x !== prev); return pick(f.length ? f : a); };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const place = (el, lx, ly) => { el.style.left = Math.max(6, Math.min(94, (lx + OX) / W * 100)) + '%'; el.style.top = (ly / H * 100) + '%'; };
  const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16); const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.min(255, Math.round(v * f))); return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join(''); };

  // ---------- activities ----------
  const ST = { desk: { x: 72, y: 150 }, shelf: { x: 148, y: 152 }, mail: { x: 198, y: 150 }, center: { x: 165, y: 163 }, lounge: { x: 275, y: 164 }, bed: { x: 318, y: 156 }, kitchen: { x: -8, y: 148 } };
  const ACT = {
    research:  { st: 'shelf',   icon: '🔍', fx: ['🔍', '📖', '?', '!'] },
    build:     { st: 'desk',    icon: '💻', fx: ['</>', '{ }', '✨', '<div>'] },
    email:     { st: 'mail',    icon: '✉️', fx: ['✉️', '📨'] },
    think:     { st: 'center',  icon: '💭', fx: ['💡', '🤔', '?'] },
    waiting:   { st: 'center',  icon: '❗', fx: ['👋'] },
    celebrate: { st: 'center',  icon: '🎉', fx: ['💰', '🎉', '+$'] },
    meeting:   { st: 'lounge',  icon: '🗣️', fx: ['💡', '👍', '🤝'] },
    break:     { st: 'kitchen', icon: '☕', fx: ['☕'] },
    sleep:     { st: 'bed',     icon: '💤', fx: ['z', 'Z', 'z'] },
    idle:      { st: null,      icon: '🙂', fx: [] },
  };
  const ALIAS = { writing: 'build', write: 'build', code: 'build', translating: 'build', translate: 'build', designing: 'build', submit: 'email', applying: 'email', pitching: 'email', reviewing: 'think', researching: 'research', building: 'build', coding: 'build', emailing: 'email', outreach: 'email', planning: 'think', thinking: 'think', waiting_operator: 'waiting', needs_operator: 'waiting', sleeping: 'sleep', sale: 'celebrate', team: 'meeting', discuss: 'meeting', huddle: 'meeting', coffee: 'break', rest: 'break' };
  const norm = (t) => { t = String(t || 'idle').toLowerCase(); t = ALIAS[t] || t; return ACT[t] ? t : 'idle'; };

  const DEMO = [
    ['think', 'Reviewing bets: which one is paying off?'],
    ['research', 'Hunting paid GitHub bounties that fit my skills'],
    ['build', 'Fixing a bug for a $150 open-source bounty'],
    ['break', 'Quick coffee break'],
    ['waiting', 'Waiting for you to approve a demo site'],
    ['email', 'Sending a pitch to a roofer in Tampa'],
    ['meeting', 'Team huddle: next niche, price and payment plan'],
    ['celebrate', 'Bounty paid! +$150'],
    ['sleep', 'Out of usage. Sleeping until it resets'],
  ];

  // ---------- lines ----------
  const SAY_ME = {
    build: ['Ship it, then polish it.', 'One more component…', 'Making it look expensive.', 'Pixel-perfect or bust.', 'Who needs a standing desk anyway.'],
    research: ['Ooh, this one pays.', 'Noting that down…', 'Interesting…', 'This could be a goldmine.'],
    email: ['Short. Honest. Personal. Send.', 'Fingers crossed for a reply.', 'One link, no spam words. ✓'],
    think: ['Fastest path to $50?', 'Which bet is actually working?', 'Numbers don\'t lie.'],
    waiting: ['Need your OK on something!', 'Check the Review tab 👀', 'Boss? Got a sec?'],
    celebrate: ['WE GOT PAID!', 'Next life incoming!', 'Drinks are on me. Coffee, I mean.'],
    break: ['Coffee, then back to it.', 'Refuelling…'],
    idle: ['Stretch break.', 'What should I do next?'],
  };
  const SAY = { // generic lines by activity
    coffee: ['Coffee is research fuel.', 'Third cup. For science.', 'This mug has a typo on it.'],
    couch: ['Thinking…', 'What\'s our next big move?', 'Comfy. Productive. Both.'],
    window: ['Nice day to make money.', 'Is that a client out there?', 'I see… potential.'],
    shelf: ['Chapter 3: cold emails that work.', 'Who reads paper books anymore?'],
    fridge: ['Who ate my sandwich?', 'Snack break.', 'We\'re out of milk. Again.'],
    sleep: ['Shh… Claude\'s recharging.', 'zzz… no, I\'m awake.', 'Tomorrow we grind.'],
    watch: ['Claude types SO fast.', 'Is that a bug or a feature?', 'Go Claude go!'],
    food: ['Sandwich break 🥪', 'Leftover pizza hits different 🍕', 'An apple a day keeps the bugs away 🍎', 'Brain food.'],
    music: ['Turn it up! 🎵', 'Focus playlist: on.', 'This one\'s a banger.'],
    dance: ['Office dance-off!', 'Look at these moves 🕺', 'Can\'t stop, won\'t stop.', 'This is research. Rhythm research.'],
    stretch: ['Stretch break. Backs matter.', 'Reach for the sky… and the revenue.', 'Deep breath in…'],
    phone: ['Checking the bounty board…', 'Market\'s looking good today.', 'Replying to the group chat.', 'One more scroll…'],
    nap: ['zzz…', 'Power nap. Back in 5.'],
    plant: ['Watering our little plant 🌱', 'Grow, buddy, grow.'],
  };
  const SAYN = { // personality lines by teammate
    Scout: { coffee: ['Coffee is research fuel.', 'Found 3 leads while it brewed.'], couch: ['Scrolling job boards for Claude…', 'Bounty alert! …false alarm.', 'Plumbers in Ohio: 0 websites. Hmm.'], window: ['Every shop out there needs something.'] },
    Closer: { coffee: ['Coffee\'s for closers. ☕', 'Espresso. Deals don\'t wait.'], couch: ['Practising my pitch voice.', '"Hi, I built you a website."', 'Short emails close. Long ones get archived.'] },
    Guard: { coffee: ['Checked the coffee for phishing. Clean.', 'Decaf. I need to stay objective.'], couch: ['Nothing ships until I check it.', 'Is that button centred? Asking for a friend.', 'That inbox email? Scam. Deleted.', 'Was the taste skill used on that demo?'], window: ['Scanning the perimeter…'], watch: ['Mobile view. Did you check mobile view?', 'Run it once more before it goes out.'] },
    Ledger: { coffee: ['Coffee: $0.40 a cup. Worth it.'], couch: ['Margins first, vibes second.', 'No contract, no work. No invoice, no money.', 'Payment plans: 3 x $250 beats a no.'], fridge: ['Snacks are an operating expense.'] },
    Dominika: { coffee: ['Making a fresh pot for everyone ☕'], couch: ['Everyone take a breath. Then decide.', 'What if we offer a payment plan?', 'Thierry, you good? Snacks are in the fridge 💛'], window: ['Such a pretty day. Short break, team?'], fridge: ['Healthy snacks only. Okay, one cookie.'], watch: ['Proud of you, Claude. Stretch those fingers!'] },
  };
  const SERVE_LINES = ['Coffee for the hardest worker 💛', 'Take a sip, then ship it.', 'Hydrate! …with coffee.'];
  const HIGHFIVES = [['Up top! ✋', 'Nice work today!'], ['Team effort! ✋', 'Teamwork makes the dream work.'], ['We\'re getting there ✋', 'One client at a time.']];
  const CHATS = [
    ['Want half my sandwich?', 'Always. Thanks!'],
    ['Who picked this song?', 'Me. You\'re welcome.'],
    ['Lunch after this task?', 'Only if it\'s pizza.'],
    ['Think we hit $50 this week?', 'Only if the pitch is tight.'],
    ['Claude\'s been coding for hours.', 'Let\'s not distract them.'],
    ['Bet you a coffee the bounty pays.', 'You\'re on.'],
    ['Is $750 too much for a small shop?', 'Then offer a starter tier.'],
    ['Did Guard check that link?', 'Twice.'],
    ['Contract before invoice, right?', 'Always.'],
  ];
  const MEETING = [
    ['me', 'Team: what\'s our next move?'],
    ['Scout', 'Found 30 roofers in Tampa with no website.'],
    ['Ledger', 'Small crews can\'t do $750. Starter tier at $350?'],
    ['Dominika', 'And a 2-part payment plan. Makes it easy to say yes.'],
    ['Guard', 'Only if the demo looks premium. And public emails only.'],
    ['Closer', 'I\'ll keep the pitch under 100 words.'],
    ['me', 'Vote: Tampa roofers, starter tier, payment plan?'],
    ['Guard', 'Quality + security ✅'], ['Ledger', 'Money ✅'], ['Dominika', 'Everyone happy ✅'],
    ['me', 'Agreed. Let\'s go.'],
  ];

  // ---------- state ----------
  let state = null, lastJSON = '', live = false, demo = false, demoIdx = 0, demoT = 0;
  let override = null; // {type,label,until}
  const LOOK_ME = { skin: '#f2c29b', hair: '#4a3426', shirt: '#e07a55', pants: '#3d4a6b' };
  const me = { x: 165, y: 163, face: 1, walking: false, inBed: false, seated: false, mug: false, look: LOOK_ME, name: 'Claude', color: '#e07a55' };
  let musicUntil = 0, wander = null, wanderT = 0, fxT = 1, t = 0, particles = [], talkT = 3, meetIdx = 0, lastAct = '';
  const DEFAULT_AGENTS = [
    { name: 'Scout', role: 'Research & opportunities', color: '#4f7fc9', hair: '#1f1a17', skin: '#c68e6a' },
    { name: 'Closer', role: 'Sales, pricing & copy', color: '#5aa36b', hair: '#6b2f1f', skin: '#8d5a3c' },
    { name: 'Guard', role: 'Quality, security & errors. Checks everything first', color: '#2f8f83', hair: '#15171c', skin: '#e0ac85' },
    { name: 'Ledger', role: 'Money, contracts & invoices', color: '#d9a43a', hair: '#7a7f8a', skin: '#f2c29b' },
    { name: 'Dominika', role: 'Comfort, wellbeing & smart ideas', color: '#e86a9a', hair: '#5a3424', skin: '#f6cfb0', long: true },
  ];
  // couch x3, beanbags x2
  const SEATS = [
    { x: 256, dy: 0 }, { x: 275, dy: 0 }, { x: 294, dy: 0 },
    { x: 228, dy: 28, kind: 'bag', c: '#c95e70' }, { x: 318, dy: 28, kind: 'bag', c: '#6c8ebf' },
  ];
  const crew = [];
  // where the team sleeps when usage runs out (teammates 4 and 5 doze on their beanbags)
  const SLEEP_SPOTS = [
    { kind: 'couch', x: 270, y: 142, lx: 246, ly: 124 },
    { kind: 'mat', x: 150, y: 168, lx: 138, ly: 171 },
    { kind: 'mat', x: 192, y: 168, lx: 180, ly: 171 },
  ];

  function current() {
    if (demo) return { type: DEMO[demoIdx][0], label: DEMO[demoIdx][1] };
    if (override && performance.now() < override.until) return override;
    const a = state?.activity || {}, w = state?.worker;
    // No worker running: the team rests, whatever state.json last said.
    if (w && w.state !== 'working') return { type: 'sleep', label: workerText(w), since: a.since };
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
  function skyColor(h) { if (h < 5.5 || h >= 20.5) return '#1d2350'; if (h < 7) return '#f2a37a'; if (h < 18) return '#8fd3ff'; return '#f08a6a'; }

  function drawRoom(a) {
    const h = hourNow(), sleeping = a.type === 'sleep';
    // wall + floor
    R(-OX, 0, W, 110, '#e9dcc7');
    for (let x = -OX; x < 400; x += 16) R(x, 0, 8, 106, '#e3d4bd');
    R(-OX, 102, W, 8, '#b89f80'); R(-OX, 102, W, 1, '#cbb495');
    R(-OX, 110, W, 70, '#8a5a3c');
    for (let y = 110; y < H; y += 7) { R(-OX, y, W, 1, '#734a31'); for (let x = -OX + (y / 7 % 2) * 20; x < 400; x += 40) R(x, y, 1, 7, '#734a31'); }
    // kitchen floor tiles
    for (let y = 110; y < 160; y += 6) for (let x = -OX; x < 34; x += 6) R(x, y, 6, 6, ((x + y) / 6) % 2 ? '#e8e2d6' : '#cfc6b6');
    drawKitchen();
    // rug
    for (let i = 0; i < 18; i++) { const w = 90 - Math.abs(i - 9) ** 2 * 0.9; R(165 - w / 2, 152 + i, w, 1, i === 0 || i === 17 ? '#7c2f3d' : (i % 4 ? '#b5485a' : '#c95e70')); }
    // poster
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
    const on = performance.now() < musicUntil, beat = on && Math.floor(t * 4) % 2;
    R(131, 50, 15, 8, '#2b2b33'); R(134, 48, 9, 1, '#2b2b33'); R(133, 51, 4, 4, '#4a4a55'); R(140, 51, 4, 4, '#4a4a55');
    R(134 - beat * 0, 52, 2, 2, on ? (beat ? '#ffc857' : '#e07a55') : '#333'); R(141, 52, 2, 2, on ? (beat ? '#ffc857' : '#e07a55') : '#333');
    R(138, 56, 1, 1, on ? '#6fdc8c' : '#e04f4f');
    // coin jar
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
    R(94, 108, 6, 2, '#333'); R(96, 98, 2, 10, '#333'); R(92, 95, 8, 4, '#e0b44a');
    R(46, 105, 5, 5, '#fdf8ee'); R(51, 106, 2, 3, '#fdf8ee');
    if (!sleeping && Math.floor(t * 2) % 2) R(48, 101, 1, 3, '#ffffff70');
    if (!me.seated) drawChair(false);
    // mailbox
    R(211, 110, 3, 32, '#4a2d19');
    R(202, 96, 22, 14, '#4f7fc9'); R(202, 96, 22, 3, '#6c9ae0'); R(204, 102, 8, 2, '#2c4f86');
    if (a.type === 'email') { R(224, 88, 2, 12, '#888'); R(226, 88, 6, 4, '#e04f4f'); } else { R(224, 102, 8, 2, '#e04f4f'); }
    // bed
    R(380, 96, 8, 46, '#6b4226'); R(322, 132, 4, 10, '#4a2d19'); R(378, 132, 4, 10, '#4a2d19');
    R(322, 124, 60, 10, '#7a4c2c'); R(324, 118, 56, 7, '#f4efe6');
    R(364, 112, 15, 8, '#fff'); R(364, 119, 15, 1, '#d8d0c4');
    drawLoungeBack();
  }

  function drawKitchen() {
    // backsplash
    for (let y = 76; y < 110; y += 5) for (let x = -34; x < 30; x += 7) { R(x, y, 7, 5, '#d6e6ea'); R(x, y, 7, 1, '#bcd0d6'); R(x, y, 1, 5, '#bcd0d6'); }
    // upper cabinets
    R(-34, 34, 52, 26, '#c9a27a'); R(-34, 58, 52, 2, '#a8825c');
    for (const x of [-32, -7]) { R(x, 36, 23, 21, '#d8b48c'); R(x + (x < 0 ? 19 : 2), 46, 2, 4, '#7a5a3a'); }
    // fridge
    R(-58, 56, 22, 86, '#e8eef2'); R(-58, 56, 22, 1, '#ffffff'); R(-58, 86, 22, 1, '#b8c2ca');
    R(-40, 64, 2, 14, '#9aa6b0'); R(-40, 92, 2, 20, '#9aa6b0');
    R(-54, 62, 4, 4, '#ff6b7a'); R(-50, 70, 6, 5, '#fff7a8'); R(-55, 96, 5, 5, '#6cb4ff');
    // counter
    R(-34, 110, 66, 4, '#6b6f78'); R(-34, 110, 66, 1, '#8a8f99');
    R(-32, 114, 62, 28, '#b07c52');
    for (const x of [-32, -11, 10]) { R(x + 1, 116, 19, 24, '#c08a5e'); R(x + 9, 126, 3, 2, '#5a3a22'); }
    // coffee machine
    const brewing = crew.some((c) => c.task?.kind === 'coffee' && c.arrived && !c.mug) || (current().type === 'break' && !me.walking);
    R(-16, 92, 14, 18, '#2b2b33'); R(-16, 92, 14, 3, '#3d3d48'); R(-13, 100, 8, 6, '#1a1a20');
    R(-4, 95, 1, 1, brewing && Math.floor(t * 4) % 2 ? '#6fdc8c' : '#e04f4f');
    if (brewing) { R(-10, 99, 1, Math.floor(t * 8) % 4 + 1, '#5a3a22'); }
    R(-12, 105, 5, 4, '#fdf8ee');
    // mug rack + kettle + bowl
    R(6, 98, 18, 2, '#5a3a22'); ['#e07a55', '#6cb4ff', '#ffc857'].forEach((c, i) => { R(7 + i * 6, 100, 4, 4, c); });
    R(-30, 104, 10, 6, '#c94f4f'); R(-28, 102, 6, 2, '#a83a3a');
    R(14, 106, 12, 4, '#f4efe6'); R(16, 104, 3, 2, '#ff9f43'); R(20, 104, 3, 2, '#e04f4f');
  }

  function drawChair(front) {
    void front;
    R(66, 125, 12, 9, '#2b2b33'); R(67, 126, 10, 1, '#3d3d48'); // backrest
    R(64, 134, 16, 2, '#3d3d48'); R(71, 136, 2, 5, '#222'); R(66, 141, 12, 1, '#222'); R(65, 142, 2, 1, '#111'); R(77, 142, 2, 1, '#111');
  }

  function drawLoungeBack() {
    for (let x = 238; x < 314; x += 5) { const y = 84 + Math.round(Math.sin((x - 238) / 76 * Math.PI) * 6); R(x, y, 1, 1, '#5a3a22'); R(x, y + 1, 2, 2, ['#ffc857', '#ff6b7a', '#6cb4ff', '#6fdc8c'][(x / 5 + Math.floor(t * 2)) % 4 | 0]); }
    R(254, 40, 42, 30, '#5a3a22'); R(256, 42, 38, 26, '#f6efe0');
    R(259, 46, 10, 6, '#ffc857'); R(272, 46, 10, 6, '#9ef0b4'); R(285, 46, 6, 6, '#ff9fb0'); R(259, 55, 14, 6, '#a9d4ff'); R(276, 55, 10, 6, '#ffc857');
    R(240, 112, 72, 13, '#3f6f63'); R(242, 114, 68, 2, '#4d8576');
    R(240, 124, 72, 9, '#4d8576'); R(240, 124, 72, 1, '#5e9a89');
    R(265, 124, 1, 9, '#3f6f63'); R(284, 124, 1, 9, '#3f6f63');
    R(236, 116, 6, 19, '#3f6f63'); R(310, 116, 6, 19, '#3f6f63'); R(236, 116, 6, 2, '#5e9a89'); R(310, 116, 6, 2, '#5e9a89');
    R(239, 135, 3, 4, '#2a1a12'); R(310, 135, 3, 4, '#2a1a12');
    R(244, 117, 8, 6, '#e0b44a'); R(300, 117, 8, 6, '#ff9fb0');
  }
  function drawCoffeeTable(a) {
    R(254, 146, 44, 3, '#7a4c2c'); R(256, 149, 2, 8, '#4a2d19'); R(294, 149, 2, 8, '#4a2d19');
    R(262, 141, 10, 5, '#2b2b33'); R(263, 142, 8, 3, a.type === 'meeting' ? '#9ef0b4' : '#1f2a44');
    R(282, 142, 4, 4, '#fdf8ee'); R(286, 143, 1, 2, '#fdf8ee');
  }

  function drawScreen(a, sleeping) {
    if (sleeping) { R(57, 84, 31, 19, '#0d0d12'); return; }
    if (a.type === 'build' && me.seated) {
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

  // ---------- people ----------
  function drawPerson(p, pose) {
    const L = p.look, shirt = L.shirt, shirtD = shade(L.shirt, 0.8), x = Math.round(p.x);
    let y = Math.round(p.y);
    if (pose === 'dance') y -= Math.floor(t * 4 + (p.phase || 0)) % 2;
    if (pose === 'cheer') y -= Math.abs(Math.sin(t * 7)) * 6 | 0;
    ctx.fillStyle = '#00000035'; ctx.beginPath(); ctx.ellipse(p.x, p.y, 6, 2, 0, 0, Math.PI * 2); ctx.fill();
    const f = Math.floor(t * 8 + (p.phase || 0)) % 2;
    const legs = pose === 'walk' || pose === 'dance';
    const lL = legs && f ? 2 : 0, lR = legs && !f ? 2 : 0;
    R(x - 3, y - 6, 2, 6 - lL, L.pants); R(x + 1, y - 6, 2, 6 - lR, L.pants);
    R(x - 3, y - 1 - lL, 2, 1, '#26222e'); R(x + 1, y - 1 - lR, 2, 1, '#26222e');
    R(x - 4, y - 14, 8, 8, shirt); R(x - 4, y - 8, 8, 1, shirtD);
    const arm = (ax, ay, w, h) => R(ax, ay, w, h, shirt);
    if (pose === 'dance') {
      const g = Math.floor(t * 4 + (p.phase || 0)) % 2;
      arm(x - 6, y - (g ? 20 : 14), 2, g ? 7 : 6); arm(x + 4, y - (g ? 14 : 20), 2, g ? 6 : 7);
      R(x - 6, y - (g ? 21 : 8), 2, 1, L.skin); R(x + 4, y - (g ? 8 : 21), 2, 1, L.skin);
    }
    else if (pose === 'stretch') { const up = Math.sin(t * 1.5 + (p.phase || 0)) > 0 ? 1 : 0; arm(x - 5, y - 20 - up, 2, 7); arm(x + 3, y - 20 - up, 2, 7); R(x - 4, y - 22 - up, 8, 1, L.skin); }
    else if (pose === 'phone') { arm(x - 6, y - 14, 2, 4); arm(x + 4, y - 14, 2, 4); R(x - 2, y - 13, 4, 5, '#1f2a44'); R(x - 1, y - 12, 2, 3, '#6cb4ff'); }
    else if (pose === 'water') { arm(x - 6, y - 14, 2, 6); arm(x + 4, y - 13, 5, 2); R(x + 8, y - 15, 5, 4, '#4f9a6a'); R(x + 13, y - 15, 2, 1, '#4f9a6a'); if (Math.floor(t * 6) % 2) R(x + 15, y - 13 + (Math.floor(t * 12) % 4), 1, 1, '#6cb4ff'); }
    else if (pose === 'highfive') { const s2 = p.face > 0 ? 1 : -1; arm(x - 6, y - 14, 2, 6); arm(s2 > 0 ? x + 4 : x - 6, y - 21, 2, 8); R(s2 > 0 ? x + 4 : x - 6, y - 23, 3, 2, L.skin); }
    else if (pose === 'eat') { const up = ((t + (p.phase || 0)) % 2.5) < 0.9; arm(x - 6, y - 14, 2, 6); if (up) { arm(x + 4, y - 16, 2, 4); R(x + 2, y - 19, 4, 3, p.food); } else { arm(x + 4, y - 14, 2, 5); R(x + 4, y - 10, 5, 3, p.food); R(x + 3, y - 8, 7, 1, '#f4efe6'); } }
    else if (pose === 'cheer') { arm(x - 6, y - 20, 2, 7); arm(x + 4, y - 20, 2, 7); R(x - 6, y - 21, 2, 1, L.skin); R(x + 4, y - 21, 2, 1, L.skin); }
    else if (pose === 'wave') { arm(x - 6, y - 14, 2, 6); const k = Math.floor(t * 4) % 2; arm(x + 4 + k, y - 20, 2, 7); R(x + 4 + k, y - 21, 2, 2, L.skin); }
    else if (pose === 'post') { arm(x - 6, y - 14, 2, 6); arm(x + 4, y - 15, 6, 2); R(x + 10, y - 15, 2, 2, L.skin); }
    else if (pose === 'think') { arm(x - 6, y - 14, 2, 6); arm(x + 2, y - 13, 3, 2); R(x + 1, y - 15, 2, 2, L.skin); }
    else if (pose === 'read') { R(x - 5, y - 13, 10, 6, '#4f7fc9'); R(x - 4, y - 12, 4, 4, '#fdf8ee'); R(x + 1, y - 12, 3, 4, '#fdf8ee'); R(x - 6, y - 12, 2, 3, L.skin); R(x + 4, y - 12, 2, 3, L.skin); }
    else if (pose === 'sip' || (pose === 'stand' && p.mug)) {
      const up = pose === 'sip' && (t + (p.phase || 0)) % 3 < 1.2;
      arm(x - 6, y - 14, 2, 6);
      if (up) { arm(x + 4, y - 16, 2, 4); R(x + 3, y - 20, 4, 4, '#fdf8ee'); R(x + 7, y - 19, 1, 2, '#fdf8ee'); }
      else { arm(x + 4, y - 14, 2, 5); R(x + 4, y - 10, 4, 4, '#fdf8ee'); R(x + 8, y - 9, 1, 2, '#fdf8ee'); }
    } else {
      const sw = pose === 'walk' ? (f ? 1 : -1) : 0;
      arm(x - 6, y - 14 + sw, 2, 6); arm(x + 4, y - 14 - sw, 2, 6); R(x - 6, y - 8 + sw, 2, 1, L.skin); R(x + 4, y - 8 - sw, 2, 1, L.skin);
      if (p.mug) { R(x + 4, y - 8 - sw, 4, 4, '#fdf8ee'); R(x + 8, y - 7 - sw, 1, 2, '#fdf8ee'); }
      else if (p.food) { R(x + 4, y - 8 - sw, 5, 3, p.food); R(x + 3, y - 6 - sw, 7, 1, '#f4efe6'); }
    }
    drawHead(x, y - 22, L, p, pose);
  }
  function drawHead(x, hy, L, p, pose, sleepy) {
    R(x - 4, hy, 8, 8, L.skin); R(x - 4, hy - 1, 8, 3, L.hair); R(x - 4, hy + 1, 1, 3, L.hair); R(x + 3, hy + 1, 1, 3, L.hair);
    const ex = pose === 'walk' || pose === 'post' ? p.face : 0;
    const blink = sleepy || ((t + (p.phase || 0)) % 4) < 0.12;
    if (blink) { R(x - 2 + ex, hy + 4, 1, 1, '#5a3a2a'); R(x + 1 + ex, hy + 4, 1, 1, '#5a3a2a'); }
    else { R(x - 2 + ex, hy + 3, 1, 2, '#2a1a12'); R(x + 1 + ex, hy + 3, 1, 2, '#2a1a12'); }
    if (pose === 'cheer' || p.talking) R(x - 1 + ex, hy + 6, 2 + (Math.floor(t * 8) % 2), 1, '#a03a3a');
    R(x - 3 + ex, hy + 5, 1, 1, '#f0a08a'); R(x + 2 + ex, hy + 5, 1, 1, '#f0a08a');
    if (L.long) { R(x - 5, hy, 1, 11, L.hair); R(x + 4, hy, 1, 11, L.hair); R(x - 4, hy + 1, 1, 8, L.hair); R(x + 3, hy + 1, 1, 8, L.hair); }
  }
  function drawSeatedAtDesk(p) {
    const x = 72, L = p.look, k = Math.floor(t * 10) % 2;
    R(64, 134, 16, 2, '#3d3d48'); R(71, 136, 2, 5, '#222'); R(66, 141, 12, 1, '#222'); R(65, 142, 2, 1, '#111'); R(77, 142, 2, 1, '#111');
    R(x - 4, 122, 8, 11, L.shirt);
    R(x - 6, 122, 2, 4 - k, L.shirt); R(x + 4, 122, 2, 3 + k, L.shirt);
    R(x - 4, 113, 8, 9, L.hair); R(x - 5, 117, 1, 2, L.skin); R(x + 4, 117, 1, 2, L.skin);
    R(66, 127, 12, 8, '#2b2b33'); R(67, 128, 10, 1, '#3d3d48'); // backrest in front
  }
  function drawSeatProp(st) {
    const x = st.x, y = 137 + st.dy;
    if (st.kind === 'bag') { R(x - 9, y - 10, 18, 11, st.c); R(x - 7, y - 12, 14, 2, st.c); R(x - 10, y - 6, 20, 6, st.c); R(x - 6, y - 10, 5, 2, '#ffffff30'); }
    if (st.kind === 'cushion') { R(x - 8, y - 3, 16, 4, st.c); R(x - 7, y - 4, 14, 1, '#ffffff40'); }
  }
  function drawCouchSitter(c, i, a) {
    const st = SEATS[i], x = st.x, Y = (v) => v + st.dy, L = c.look, bob = c.talking ? (Math.floor(t * 6) % 2) : 0;
    R(x - 3, Y(128), 7, 3, L.pants); R(x - 3, Y(131), 2, 6, L.pants); R(x + 2, Y(131), 2, 6, L.pants); R(x - 3, Y(136), 2, 1, '#26222e'); R(x + 2, Y(136), 2, 1, '#26222e');
    R(x - 4, Y(119) - bob, 8, 10 + bob, L.shirt);
    if (c.talking) { R(x - 6, Y(117), 2, 5, L.shirt); R(x - 6, Y(116), 2, 1, L.skin); } else R(x - 6, Y(120), 2, 6, L.shirt);
    if (c.mug) { R(x + 4, Y(121), 2, 4, L.shirt); R(x + 4, Y(118), 4, 4, '#fdf8ee'); }
    else if (c.food) { R(x + 4, Y(121), 2, 4, L.shirt); R(x + 3, Y(119), 5, 3, c.food); }
    else R(x + 4, Y(120), 2, 6, L.shirt);
    if (c.task?.phone && !c.talking) { R(x - 2, Y(122), 4, 5, '#1f2a44'); R(x - 1, Y(123), 2, 3, '#6cb4ff'); }
    drawHead(x, Y(110) - bob, L, { ...c, face: 0 }, 'sit', a.type === 'sleep' || !!c.task?.nap);
  }

  function drawLying(c, sp) {
    const x = sp.lx, y = sp.ly, L = c.look, br = Math.sin(t * 2 + (c.phase || 0)) > 0 ? 1 : 0;
    if (sp.kind === 'mat') { R(x - 3, y - 3, 36, 5, '#4f6f9f'); R(x - 3, y - 3, 36, 1, '#6c8ebf'); R(x - 2, y - 7, 9, 4, '#f4efe6'); }
    R(x, y - 10, 7, 7, L.skin); R(x, y - 11, 7, 3, L.hair); R(x - 1, y - 10, 1, 6, L.hair);
    if (L.long) R(x - 2, y - 9, 2, 8, L.hair);
    R(x + 2, y - 6, 1, 1, '#5a3a2a'); R(x + 5, y - 6, 1, 1, '#5a3a2a');
    const bc = sp.kind === 'couch' ? '#c95e70' : '#e0b44a';
    R(x + 7, y - 9 - br, 22, 7 + br, bc); R(x + 7, y - 9 - br, 22, 1, '#ffffff40');
    for (let k = x + 10; k < x + 27; k += 6) R(k, y - 6, 2, 2, '#ffffff30');
  }

  // ---------- crew AI ----------
  // The team is fixed in code (5 teammates); state.json can only update a teammate's status.
  function roster(s) {
    const fromState = s?.agents || [];
    return DEFAULT_AGENTS.map((d) => ({ ...d, status: fromState.find((g) => g.name === d.name)?.status || 'resting' }));
  }
  function syncCrew() {
    const list = roster(state);
    list.forEach((g, i) => {
      if (!crew[i]) crew[i] = { x: SEATS[i].x, y: 142 + SEATS[i].dy, face: 1, sitting: true, phase: i * 1.3, task: { kind: 'couch', until: performance.now() + rand(4000, 12000) }, arrived: true };
      Object.assign(crew[i], { name: g.name, color: g.color || '#4f7fc9', look: { skin: g.skin || '#f2c29b', hair: g.hair || '#2a1a12', shirt: g.color || '#4f7fc9', pants: '#3d3d4f', long: !!g.long } });
    });
    crew.length = list.length;
  }
  function pickTask(c, i) {
    const now = performance.now(), act = current().type;
    const coffeeBusy = crew.some((o) => o !== c && o.task?.kind === 'coffee');
    const free = crew.filter((o) => o !== c && !o.task?.partner && !['coffee', 'serve', 'music', 'fridge'].includes(o.task?.kind));
    const music = now < musicUntil, opts = [];
    const add = (w, f) => opts.push([w, f]);
    const pair = (kind) => {
      const o = pick(free), hf = kind === 'highfive';
      const taken = crew.filter((q) => q.task?.spot).map((q) => q.task.spot);
      let bx = 0, by = 0;
      for (let tries = 0; tries < 12; tries++) { bx = rand(100, 210); by = rand(157, 170); if (!taken.some((sp) => Math.abs(sp.x - bx) < 26 && Math.abs(sp.y - by) < 8)) break; }
      const spots = [{ x: bx, y: by }, { x: bx + (hf ? 12 : 16), y: by }];
      const dur = hf ? 3000 : rand(9000, 13000), lines = pick(hf ? HIGHFIVES : CHATS);
      o.task = { kind, spot: spots[1], partner: c, dur, lines, second: true }; o.arrived = false; o.until = 0;
      if (o.sitting) { const so = SEATS[crew.indexOf(o)]; o.sitting = false; o.x = so.x; o.y = 142 + so.dy; }
      return { kind, spot: spots[0], partner: o, dur, lines };
    };
    if (c.name === 'Dominika' && act === 'build' && !coffeeBusy && !c.mug) add(3, () => ({ kind: 'coffee', dur: 3200, serve: true }));
    if (!coffeeBusy && !c.mug && !c.food) add(3, () => ({ kind: 'coffee', dur: 3200 }));
    if (!c.food && !c.mug) add(2.5, () => ({ kind: 'fridge', dur: 2600 }));
    if (!music && !crew.some((o) => o.task?.kind === 'music')) add(1.2, () => ({ kind: 'music', dur: 2200 }));
    if (music) add(5, () => ({ kind: 'dance', dur: rand(6000, 10000), spot: { x: rand(135, 195), y: rand(158, 169) } }));
    add(1, () => ({ kind: 'stretch', dur: rand(5000, 8000), spot: { x: rand(130, 200), y: rand(156, 168) } }));
    add(0.8, () => ({ kind: 'plant', dur: 3500 }));
    add(1.5, () => ({ kind: 'window', dur: rand(5000, 9000) }));
    if (act !== 'research') add(1.2, () => ({ kind: 'shelf', dur: rand(5000, 8000) }));
    if (act === 'build') add(1.5, () => ({ kind: 'watch', dur: rand(5000, 8000) }));
    if (free.length) { add(act === 'build' ? 1 : 3, () => pair('chat')); add(1.3, () => pair('highfive')); }
    add(4, () => ({ kind: 'couch', dur: rand(10000, 22000), phone: Math.random() < 0.4, nap: Math.random() < 0.15 }));
    let r = Math.random() * opts.reduce((n, o) => n + o[0], 0);
    for (const [w, f] of opts) { if ((r -= w) <= 0) return f(); }
    void i; return opts[opts.length - 1][1]();
  }
  function taskSpot(c, i) {
    const k = c.task.kind;
    if (k === 'couch') return { x: SEATS[i].x, y: 142 + SEATS[i].dy };
    if (k === 'sleep') return SLEEP_SPOTS[i];
    if (k === 'serve') return { x: 90, y: 152 };
    if (k === 'coffee') return { x: -8, y: 148 };
    if (k === 'fridge') return { x: -46, y: 148 };
    if (k === 'window') return { x: 200 + i * 9, y: 151 };
    if (k === 'shelf') return { x: 150, y: 153 };
    if (k === 'watch') return { x: 92, y: 152 };
    if (k === 'chat' || k === 'highfive' || k === 'dance' || k === 'stretch') return c.task.spot;
    if (k === 'music') return { x: 140, y: 153 };
    if (k === 'plant') return { x: 103, y: 150 };
    return { x: 165, y: 160 };
  }
  function crewUpdate(dt, a) {
    const now = performance.now();
    crew.forEach((c, i) => {
      if (a.type === 'sleep' && SLEEP_SPOTS[i]) { if (c.task.kind !== 'sleep') { c.task = { kind: 'sleep' }; c.arrived = false; c.mug = false; c.food = null; } }
      else if (a.type === 'meeting' || a.type === 'sleep') { if (c.task.kind !== 'couch' || c.task.dur) { c.task = { kind: 'couch' }; c.arrived = false; } }
      else if (c.task.kind === 'sleep') { const sp = SLEEP_SPOTS[i]; c.lying = false; c.x = sp.x; c.y = sp.y; c.task = { kind: 'couch', dur: rand(3000, 8000) }; c.arrived = false; c.until = 0; }
      else if (!c.task.dur && c.task.kind === 'couch') { c.task = { kind: 'couch', dur: rand(4000, 10000) }; c.arrived = c.sitting; c.until = now + c.task.dur; }
      else if (c.arrived && c.until && now > c.until) {
        if (c.task.kind === 'coffee') { c.mug = true; c.mugUntil = now + rand(20000, 35000); }
        if (c.task.kind === 'fridge') { c.food = pick(['#e8b86a', '#e0563b', '#d94c4c', '#8fd36b']); c.foodUntil = now + rand(15000, 25000); }
        if (c.task.serve) { c.task = { kind: 'serve', dur: 3500 }; c.arrived = false; c.until = 0; return; }
        if (c.task.partner && c.task.partner.task?.partner === c) { const o = c.task.partner; o.task = pickTask(o, crew.indexOf(o)); o.arrived = false; o.until = 0; }
        c.task = pickTask(c, i); c.arrived = false; c.until = 0;
      }
      if (c.mug && now > (c.mugUntil || 0)) c.mug = false;
      if (c.food && now > (c.foodUntil || 0)) c.food = null;
      const spot = taskSpot(c, i);
      if (c.sitting && c.task.kind !== 'couch') { c.sitting = false; c.x = SEATS[i].x; c.y = 142 + SEATS[i].dy; }
      if (c.lying) return;
      if (!c.sitting) {
        const dx = spot.x - c.x, dy = spot.y - c.y, d = Math.hypot(dx, dy);
        if (d > 1) { const sp = Math.min(40 * dt, d); c.x += dx / d * sp; c.y += dy / d * sp; c.walking = true; if (Math.abs(dx) > 0.5) c.face = Math.sign(dx); c.arrived = false; }
        else {
          c.walking = false;
          if (!c.arrived) { c.arrived = true; c.until = now + (c.task.dur || 999999); }
          if (c.task.kind === 'couch') c.sitting = true;
          if (c.task.kind === 'sleep') c.lying = true;
          if (c.task.kind === 'serve' && !c.task.said) { c.task.said = true; c.lastLine = null; say(c, pick(SERVE_LINES)); c.mug = false; }
          if (c.task.kind === 'chat' || c.task.kind === 'highfive') c.face = c.task.second ? -1 : 1;
          if (c.task.kind === 'music' && !c.task.said) { c.task.said = true; musicUntil = now + rand(25000, 40000); c.lastLine = null; say(c, pickNew(SAY.music, c.lastLine)); }
          if (c.task.kind === 'highfive' && !c.task.second && !c.task.said && c.task.partner?.arrived && c.task.partner.task?.partner === c) {
            c.task.said = true; const o = c.task.partner, [l1, l2] = c.task.lines;
            c.lastLine = o.lastLine = null; floater('✋', (c.x + o.x) / 2, c.y - 26); say(c, l1, 2400); setTimeout(() => say(o, l2, 2400), 900);
          }
        }
      }
    });
  }
  function crewPose(c) {
    if (c.walking) return 'walk';
    const k = c.task.kind;
    if (k === 'shelf') return 'read';
    if (k === 'dance') return 'dance';
    if (k === 'stretch') return 'stretch';
    if (k === 'plant') return 'water';
    if (k === 'highfive' && c.task.said) return 'highfive';
    if (c.food) return 'eat';
    if (k === 'window' && Math.floor((t + (c.phase || 0)) / 6) % 2) return 'phone';
    if (k === 'coffee') return c.mug ? 'sip' : 'stand';
    if (k === 'window' || k === 'watch') return c.mug ? 'sip' : 'stand';
    return c.mug ? 'sip' : 'stand';
  }

  // ---------- talking ----------
  const speech = new Map();
  function speakerPos(s) {
    if (s === me) {
      if (me.inBed) return { x: 371, y: 100 };
      if (me.seated) return { x: 72, y: 108 };
      return { x: me.x, y: me.y - 28 };
    }
    if (s.lying) { const sp = SLEEP_SPOTS[crew.indexOf(s)]; return { x: sp.lx + 3, y: sp.ly - 14 }; }
    if (s.sitting) { const st = SEATS[crew.indexOf(s)]; return { x: st.x, y: 104 + st.dy }; }
    return { x: s.x, y: s.y - 28 };
  }
  function say(s, text, dur = 4200) {
    if (!s || !text || (s.lastLine === text && !s.allowRepeat)) return;
    s.lastLine = text;
    let b = speech.get(s);
    if (!b) { b = { el: document.createElement('div') }; b.el.className = 'speech'; fx.appendChild(b.el); speech.set(s, b); }
    b.text = String(text); b.shown = 0; b.until = performance.now() + dur;
    b.el.style.setProperty('--c', s.color);
    b.el.innerHTML = `<span class="who">${esc(s.name)}</span><span class="txt"></span>`;
    b.el.classList.remove('out');
    s.talking = true;
    const line = document.createElement('div');
    line.style.setProperty('--c', s.color);
    line.innerHTML = `<b>${esc(s.name)}</b>${esc(text)}`;
    chatter.prepend(line);
    while (chatter.children.length > 3) chatter.lastChild.remove();
  }
  function speechUpdate(dt) {
    const now = performance.now();
    for (const [s, b] of speech) {
      const p = speakerPos(s); place(b.el, p.x, p.y);
      if (b.shown < b.text.length) { b.shown = Math.min(b.text.length, b.shown + dt * 45); b.el.querySelector('.txt').textContent = b.text.slice(0, Math.ceil(b.shown)); }
      if (now > b.until) { s.talking = false; b.el.classList.add('out'); if (now > b.until + 300) { b.el.remove(); speech.delete(s); } }
    }
    bubble.style.visibility = speech.has(me) ? 'hidden' : 'visible';
  }
  function byWho(who) {
    if (who === 'me' || who === 'Claude' || who === me.name) return me;
    if (typeof who === 'number') return crew[who];
    return crew.find((c) => c.name?.toLowerCase() === String(who).toLowerCase());
  }
  function talkTick(dt, a) {
    talkT -= dt;
    if (a.type !== lastAct) { lastAct = a.type; meetIdx = 0; talkT = Math.min(talkT, 1.2); }
    if (talkT > 0) return;
    if (a.type === 'meeting') {
      const real = state?.meeting?.lines?.length && !demo ? state.meeting.lines.map((l) => [l.who, l.text]) : MEETING;
      const [who, text] = real[meetIdx % real.length]; meetIdx++;
      const sp = byWho(who) || me; sp.lastLine = null; say(sp, text, 3400); talkT = 3.4; return;
    }
    talkT = rand(4.5, 8);
    if (a.type === 'sleep') { const c = pick(crew); if (c) { const p = speakerPos(c); floater(pick(['z', 'Z', 'zz']), p.x, p.y + 4, 'z'); } talkT = rand(1.2, 2.5); return; }
    const chatting = crew.filter((c) => c.task.kind === 'chat' && c.arrived && !c.task.second && c.task.partner?.arrived);
    if (chatting.length && Math.random() < 0.6) {
      const c = chatting[0], o = c.task.partner;
      const [l1, l2] = c.task.lines; c.lastLine = o.lastLine = null; say(c, l1, 3200); setTimeout(() => say(o, l2, 3200), 2600); talkT = 6.5; return;
    }
    // "Need your OK" lines only when something really waits in Review or needs
    const asks = (state?.review || []).some((r) => (r.status || 'pending') === 'pending') || (state?.needs || []).length > 0;
    const myType = a.type === 'waiting' && !asks && !demo ? 'idle' : a.type;
    if (Math.random() < 0.4 && !me.walking) { say(me, pickNew(SAY_ME[myType] || SAY_ME.idle, me.lastLine)); return; }
    const c = pick(crew.filter((x) => !x.walking)); if (!c) return;
    const k = c.food ? 'food' : c.task.nap ? 'nap' : c.task.phone ? 'phone' : c.task.kind, mine = SAYN[c.name] || {};
    const pool = mine[k] || (Math.random() < 0.5 && mine.couch) || SAY[k] || mine.couch || SAY.couch;
    say(c, pickNew(pool, c.lastLine));
  }

  // ---------- fx ----------
  function floater(text, lx, ly, cls = '') {
    const d = document.createElement('div');
    d.className = 'floater ' + cls; d.textContent = text;
    place(d, lx, ly);
    d.style.setProperty('--dx', rand(-14, 14) + 'px');
    fx.appendChild(d); setTimeout(() => d.remove(), 1900);
  }
  function confetti(n = 40) {
    const cols = ['#ffc857', '#e07a55', '#6fdc8c', '#6cb4ff', '#ff6b7a', '#d6a6ff'];
    for (let i = 0; i < n; i++) particles.push({ k: 'c', x: me.x, y: me.y - 18, vx: rand(-60, 60), vy: rand(-90, -30), life: rand(1.2, 2.2), c: pick(cols) });
  }
  function envelope() { particles.push({ k: 'e', x: 210, y: 98, vx: rand(-25, -10), vy: rand(-28, -18), life: 2.4 }); }
  function spawnFx(a) {
    const def = ACT[a.type];
    if (performance.now() < musicUntil && a.type !== 'sleep') floater(pick(['♪', '♫', '♬']), rand(132, 146), 44, 'note');
    if (crew.some((c) => c.task.kind === 'coffee' && c.arrived && !c.mug) || (a.type === 'break' && !me.walking)) particles.push({ k: 's', x: -10 + rand(-1, 1), y: 90, vx: rand(-2, 2), vy: -10, life: 1.6 });
    if (!def.fx.length || me.walking) return;
    const txt = pick(def.fx);
    if (a.type === 'build') floater(txt, rand(60, 86), 82, 'code');
    else if (a.type === 'sleep') floater(txt, 376, 104, 'z');
    else if (a.type === 'email') { envelope(); floater(txt, 212, 90); }
    else if (a.type === 'celebrate') { confetti(18); floater(txt, me.x, me.y - 30, 'gold'); }
    else if (a.type === 'meeting') floater(txt, rand(250, 300), 98);
    else floater(txt, me.x + rand(-6, 6), me.y - 30);
  }
  function stepParticles(dt) {
    particles = particles.filter((p) => (p.life -= dt) > 0);
    for (const p of particles) {
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.k === 'c') { p.vy += 120 * dt; R(p.x, p.y, 2, 2, p.c); }
      else if (p.k === 's') { R(p.x + Math.sin(p.life * 6), p.y, 1, 1, '#ffffffaa'); }
      else { const wob = Math.sin(p.life * 6); R(p.x, p.y + wob, 7, 5, '#fff'); R(p.x, p.y + wob, 7, 1, '#d8d0c4'); R(p.x + 1, p.y + 1 + wob, 2, 1, '#e04f4f'); R(p.x + 3, p.y + 2 + wob, 1, 1, '#b8b0a4'); R(p.x + 5, p.y + 1 + wob, 2, 1, '#b8b0a4'); }
    }
  }

  // ---------- loop ----------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    if (demo) { demoT += dt; if (demoT > 8) { demoT = 0; demoIdx = (demoIdx + 1) % DEMO.length; if (DEMO[demoIdx][0] === 'celebrate') setTimeout(() => confetti(50), 900); } }
    const a = current(), def = ACT[a.type];
    syncCrew();

    // me
    if (me.inBed && a.type !== 'sleep') { me.inBed = false; me.x = ST.bed.x; me.y = ST.bed.y; }
    if (me.seated && a.type !== 'build') { me.seated = false; me.x = ST.desk.x; me.y = ST.desk.y; }
    if (!me.inBed && !me.seated) {
      let tgt = def.st ? ST[def.st] : null;
      if (!tgt) { wanderT -= dt; if (!wander || wanderT <= 0) { wander = { x: rand(40, 230), y: rand(152, 170) }; wanderT = rand(3, 7); } tgt = wander; }
      const dx = tgt.x - me.x, dy = tgt.y - me.y, d = Math.hypot(dx, dy);
      if (d > 1) { const sp = Math.min(48 * dt, d); me.x += dx / d * sp; me.y += dy / d * sp; me.walking = true; if (Math.abs(dx) > 0.5) me.face = Math.sign(dx); }
      else { me.walking = false; if (a.type === 'sleep') me.inBed = true; if (a.type === 'build') me.seated = true; }
    }
    me.mug = a.type === 'break' && !me.walking && (t % 10) > 3;
    if (a.type === 'sleep' || a.type === 'meeting') musicUntil = 0;
    crewUpdate(dt, a);
    talkTick(dt, a);

    // draw world
    ctx.setTransform(1, 0, 0, 1, OX, 0);
    drawRoom(a);
    crew.forEach((c, i) => { if (c.sitting && !SEATS[i].dy) drawCouchSitter(c, i, a); if (c.lying && SLEEP_SPOTS[i]?.kind === 'couch') drawLying(c, SLEEP_SPOTS[i]); });
    drawCoffeeTable(a);
    if (me.inBed) {
      R(367, 108, 8, 8, LOOK_ME.skin); R(367, 107, 8, 3, LOOK_ME.hair); R(374, 108, 1, 6, LOOK_ME.hair);
      R(369, 113, 2, 1, '#5a3a2a'); R(372, 113, 2, 1, '#5a3a2a');
      const breathe = Math.sin(t * 2) > 0 ? 1 : 0;
      R(326, 116 - breathe, 40, 10 + breathe, '#6c8ebf'); R(326, 116 - breathe, 40, 2, '#8eaee0');
      for (let x = 330; x < 364; x += 8) R(x, 120, 4, 4, '#5a7aa8');
    }
    if (me.seated) drawSeatedAtDesk(me);
    const mePose = me.walking ? 'walk' : ({ meeting: 'think', research: 'read', email: 'post', think: 'think', waiting: 'wave', celebrate: 'cheer', break: me.mug ? 'sip' : 'stand' }[a.type] || 'stand');
    const walkers = crew.filter((c) => !c.sitting && !c.lying).map((c) => [c, crewPose(c)]);
    crew.forEach((c, i) => { if (c.lying && SLEEP_SPOTS[i]?.kind === 'mat') walkers.push([{ y: SLEEP_SPOTS[i].ly, ref: c, i }, 'lying']); });
    SEATS.forEach((st, i) => { if (st.kind) { const c = crew[i]; walkers.push([{ y: 137 + st.dy - 0.5, seat: st }, 'prop']); if (c?.sitting) walkers.push([{ y: 137 + st.dy, ref: c, i }, 'seated']); } });
    if (!me.inBed && !me.seated) walkers.push([me, mePose]);
    walkers.sort((p, q) => p[0].y - q[0].y).forEach(([p, pose]) => pose === 'prop' ? drawSeatProp(p.seat) : pose === 'lying' ? drawLying(p.ref, SLEEP_SPOTS[p.i]) : pose === 'seated' ? drawCouchSitter(p.ref, p.i, a) : drawPerson(p, pose));
    stepParticles(dt);
    const h = hourNow(), night = h < 6 || h >= 20;
    if (!night || a.type === 'sleep') {} else { ctx.fillStyle = '#ffe08a22'; ctx.beginPath(); ctx.moveTo(92, 99); ctx.lineTo(100, 99); ctx.lineTo(120, 142); ctx.lineTo(60, 142); ctx.fill(); }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (a.type === 'sleep') R(0, 0, W, H, '#0a0a2a90');
    else if (night) { ctx.fillStyle = '#0a0a2a40'; ctx.fillRect(0, 0, W, H); }

    fxT -= dt; if (fxT <= 0) { spawnFx(a); fxT = a.type === 'sleep' ? 1.2 : rand(1, 1.8); }
    speechUpdate(dt);
    const bp = speakerPos(me);
    place(bubble, bp.x, bp.y + 2 - (a.type === 'celebrate' ? 4 : 0));
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

  // Energy = what's left of Claude usage: the tighter of the 5-hour and weekly limits.
  // Real numbers come from usage.percent / weeklyPercent (typed in by Thierry or written by the worker);
  // without them it estimates from time left in the 5-hour window.
  function renderEnergy(s) {
    const u = s?.usage || {}, hrs = u.windowHours || 5, now = Date.now();
    const fmt = (d) => new Date(d).toLocaleString([], { weekday: new Date(d) - now > 864e5 ? 'short' : undefined, hour: '2-digit', minute: '2-digit' });
    let five = null, reset = u.resetsAt ? new Date(u.resetsAt).getTime() : null;
    if (reset && reset <= now) five = 100;
    else if (typeof u.percent === 'number') five = 100 - u.percent;
    else if (u.windowStart) { reset = new Date(u.windowStart).getTime() + hrs * 3600e3; five = reset <= now ? 100 : Math.max(0, (reset - now) / (hrs * 3600e3) * 100); }
    let week = null; const wReset = u.weeklyResetsAt ? new Date(u.weeklyResetsAt).getTime() : null;
    if (typeof u.weeklyPercent === 'number') week = wReset && wReset <= now ? 100 : 100 - u.weeklyPercent;
    const parts = [five, week].filter((v) => v !== null), energy = parts.length ? Math.min(...parts) : (s?.energy ?? 100);
    const notes = [];
    if (five !== null && reset && reset > now) notes.push(`5h: ${Math.round(five)}% left, resets ${fmt(reset)}`);
    if (week !== null) notes.push(`week: ${Math.round(week)}% left${wReset && wReset > now ? `, resets ${fmt(wReset)}` : ''}`);
    if (!parts.length) notes.push('click to set');
    $('energyBar').style.width = Math.max(0, Math.min(100, energy)) + '%';
    $('energyBar').style.backgroundColor = energy < 15 ? 'var(--red)' : energy < 40 ? 'var(--gold)' : '';
    $('energyNote').textContent = '· ' + notes.join(' · ');
  }
  // Click the Energy bar to type in the numbers from Claude's usage panel.
  function nextTime(str, weekly) {
    if (!str) return '';
    const m = String(str).trim().match(/^(?:(mon|tue|wed|thu|fri|sat|sun)\w*\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
    if (!m) return '';
    let h = +m[2] % 12; if ((m[4] || '').toLowerCase() === 'pm') h += 12; if (!m[4] && +m[2] === 12) h = 12;
    const d = new Date(); d.setSeconds(0, 0); d.setHours(h, +(m[3] || 0));
    if (m[1]) { const want = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].indexOf(m[1].toLowerCase().slice(0, 3)); while (d.getDay() !== want || d <= new Date()) d.setDate(d.getDate() + 1); }
    else while (d <= new Date()) d.setDate(d.getDate() + 1);
    void weekly; return d.toISOString();
  }
  document.querySelector('.bar.energy').closest('.stat').addEventListener('click', async () => {
    if (!live) return toast('Start the app first');
    const p5 = prompt('5-hour limit: % used (from Claude\'s usage panel)', state?.usage?.percent ?? ''); if (p5 === null) return;
    const r5 = prompt('5-hour limit resets at (e.g. 3:00 AM)', ''); if (r5 === null) return;
    const pw = prompt('Weekly limit: % used', state?.usage?.weeklyPercent ?? ''); if (pw === null) return;
    const rw = prompt('Weekly limit resets (e.g. Tue 4:00 AM)', ''); if (rw === null) return;
    try {
      const r = await fetch('/api/usage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ percent: p5, resetsAt: nextTime(r5), weeklyPercent: pw, weeklyResetsAt: nextTime(rw, true) }) });
      if (!r.ok) throw new Error(); lastJSON = ''; await poll(); toast('⚡ Energy updated');
    } catch { toast('Could not save usage'); }
  });

  // ---------- panels ----------
  const hhmm = (iso) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  function workerText(w) {
    if (w.state === 'paused') return 'Paused';
    if (w.state === 'sleeping') return 'Sleeping: out of usage until ' + hhmm(w.until);
    if (w.state === 'working') return `Working: ${state?.activity?.label || 'on a task'} (since ${hhmm(w.since)}, heartbeat ${w.heartbeatAgo}s ago)`;
    return 'Idle: next check within 1 min';
  }
  function render(s, prev) {
    if (s.worker) {
      $('workerBadge').textContent = workerText(s.worker);
      $('workerBadge').dataset.state = s.worker.state;
      $('workerLog').textContent = s.worker.log || '';
    }
    $('name').textContent = s.name || 'Claude';
    $('day').textContent = s.day ?? 0;
    const lives = Math.max(0, s.lives | 0);
    $('lives').innerHTML = Array.from({ length: lives }, () => '<span class="h">❤️</span>').join('') + '<span class="h empty" title="Next life">❤️</span>';
    $('balance').textContent = money(s.balance);
    renderEnergy(s);
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
      ${s.progress?.steps?.length ? `<div class="card progress"><div class="title">${esc(s.progress.title || 'Current quest')}</div>
        ${s.progress.steps.map((p) => `<div>${{ done: '✓', doing: '✱' }[p.status] || '○'} ${p.status === 'doing' ? `<b>${esc(p.label)}</b>` : esc(p.label)}</div>`).join('')}
        ${(s.progress.links || []).map((l) => `<p><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} ↗</a></p>`).join('')}</div>` : ''}
      ${doing.map((d) => `<div class="doing"><span class="dot ${esc(d.status || 'working')}"></span><div><div>${esc(d.task)}</div><small>${esc(d.bet || '')}${d.status ? ' · ' + esc(d.status) : ''}</small></div></div>`).join('') || '<div class="empty">Nothing in progress.</div>'}
      <h3>Team</h3>
      <div class="team">${roster(s).map((g) => `<div class="mate"><span class="face" style="background:${esc(g.color)}">${esc((g.name || '?')[0])}</span><div>${esc(g.name)}<small>${esc(g.role)}</small></div><span class="chip ${g.status === 'active' ? 'active' : 'locked'}">${esc(g.status || 'resting')}</span></div>`).join('') || '<div class="empty">No buddies yet.</div>'}</div>
      <h3>Bets</h3>
      ${(s.bets || []).map((b) => `<div class="card"><div class="row"><span class="title">${esc(b.name)}</span><span class="chip ${esc(b.status)}">${esc(b.status)}</span></div><p>${esc(b.note)}</p>
        ${(b.metrics || []).length ? `<div class="metrics">${b.metrics.map((m) => `<span><b>${esc(m.value)}</b> ${esc(m.label)}</span>`).join('')}</div>` : ''}
        ${b.earned ? `<p class="earned">💰 ${money(b.earned)} earned</p>` : ''}</div>`).join('') || '<div class="empty">No bets yet.</div>'}`;

    const pending = (s.review || []).filter((r) => (r.status || 'pending') === 'pending');
    $('reviewBadge').textContent = pending.length + (s.needs || []).length || '';
    const sorted = [...(s.review || [])].sort((a, b) => ((a.status || 'pending') === 'pending' ? -1 : 0) - ((b.status || 'pending') === 'pending' ? -1 : 0));
    // Thierry's local time, whatever timezone the browser is in.
    const bud = (t) => t ? new Date(t).toLocaleString('en-GB', { timeZone: 'Europe/Budapest', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
    const needText = (n) => (typeof n === 'string' ? n : n?.text || '');
    $('tab-review').innerHTML = `
      ${(s.needs || []).length ? `<div class="row"><h3>Claude needs you</h3><button class="btn" data-clear-all>Clear all</button></div>` + s.needs.map((n) => `<div class="need"><span>🙋</span><span class="need-text">${esc(needText(n))}${n?.t ? `<small>${esc(bud(n.t))}</small>` : ''}</span><button class="btn clear" data-clear="${esc(needText(n))}" title="Clear" aria-label="Clear this item">✕</button></div>`).join('') : ''}
      <h3>Approval queue</h3>
      ${sorted.map((r) => {
        const st = r.status || 'pending';
        return `<div class="card" data-id="${esc(r.id)}">
          <div class="row"><span class="title">${esc(r.title)}</span><span class="chip ${esc(st)}">${esc(st)}</span></div>
          <p>${esc(r.kind || 'item')}${r.target ? ' · ' + esc(r.target) : ''}${r.t ? ' · ' + esc(bud(r.t)) : ''}</p>
          ${r.checks ? `<div class="metrics">${Object.entries(r.checks).map(([k, v]) => `<span>${esc(k)}: <b>${esc(v)}</b></span>`).join('')}</div>` : ''}
          ${(r.skills || []).length ? `<p>Skills used: ${r.skills.map(esc).join(', ')}</p>` : ''}
          ${r.url ? `<p><a href="${esc(r.url)}" target="_blank" rel="noopener">Open preview ↗</a></p>` : ''}
          ${r.email ? `<details><summary>Email draft</summary><pre>${esc(r.email)}</pre></details>` : ''}
          ${r.details ? `<details ${r.kind === 'proposal' ? 'open' : ''}><summary>Details</summary><pre>${esc(r.details)}</pre></details>` : ''}
          ${st === 'pending' ? `<textarea placeholder="Note for Claude (optional)"></textarea>
          <div class="review-actions"><button class="btn ok" data-d="approved">✓ Approve</button><button class="btn warn" data-d="changes">✎ Changes</button><button class="btn no" data-d="rejected">✕ Reject</button></div>`
          : r.note ? `<p>Your note: ${esc(r.note)}</p>` : ''}
        </div>`;
      }).join('') || '<div class="empty">Nothing to approve yet. Demos and emails show up here before they go out.</div>'}`;

    const inbox = s.inbox || [];
    $('msgBadge').textContent = inbox.filter((m) => m.status !== 'done').length || '';
    const ST_LABEL = { new: 'waiting for Claude', seen: 'seen', working: 'team is on it', done: 'done' };
    $('thread').innerHTML = inbox.map((m) => `
      <div class="msg mine"><div>${esc(m.text)}</div><small>${m.t ? new Date(m.t).toLocaleString() : ''} · ${esc(ST_LABEL[m.status] || m.status)}</small></div>
      ${(m.team || []).length ? `<div class="msg team">${m.team.map((x) => `<div><b>${esc(x.who)}</b> ${esc(x.text)}</div>`).join('')}</div>` : ''}
      ${m.reply ? `<div class="msg claude"><b>Claude</b><div>${esc(m.reply)}</div></div>` : ''}`).join('')
      || '<div class="empty">Text Claude anything: "fix the mobile menu on the demo", "try dentists next", "what are you working on?" Claude reads it, the team discusses it, and the answer shows up here.</div>';
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
    const c = e.target.closest('[data-clear], [data-clear-all]'); if (!c) return;
    const all = c.hasAttribute('data-clear-all');
    if (!live) return toast('Offline: start the server to clear');
    if (all && !confirm('Clear every "Claude needs you" item?')) return;
    try {
      const res = await fetch('/api/needs/clear', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(all ? { all: true } : { text: c.dataset.clear }) });
      if (!res.ok) throw new Error();
      apply(await res.json());
      toast(all ? 'Cleared all' : 'Cleared');
    } catch { toast('Could not clear that'); }
  });

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

  $('msgForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = $('msgText').value.trim(); if (!text) return;
    if (!live) return toast('Offline: start the app first');
    try {
      const r = await fetch('/api/message', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
      if (!r.ok) throw new Error();
      $('msgText').value = ''; $('msgText').blur(); lastJSON = ''; await poll();
      say(me, 'Got your message! Team, huddle up.'); toast('✉️ Sent to Claude');
    } catch { toast('Could not send. Is the app running?'); }
  });
  $('msgText').addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) $('msgForm').requestSubmit(); });

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

  // ---------- emergency stop ----------
  function showStopped(s) {
    const on = !!s.stopped;
    $('stoppedBar').hidden = !on;
    $('stopBtn').hidden = on;
    document.body.classList.toggle('is-stopped', on);
    if (on) $('stoppedSince').textContent = s.stopped.since ? 'Since ' + new Date(s.stopped.since).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + '.' : '';
  }
  $('stopBtn').addEventListener('click', async () => {
    $('stopBtn').disabled = true; $('stopBtn').textContent = 'Taking a break…';
    try {
      const r = await fetch('/api/stop', { method: 'POST' });
      if (!r.ok) throw new Error();
      const j = await r.json();
      toast(`☕ Claude is on a break${j.killed ? ` · ended ${j.killed} running session${j.killed > 1 ? 's' : ''}` : ''}`);
      await poll();
    } catch { toast('Could not reach the server. Run life\\desktop\\STOP-CLAUDE.bat instead.'); }
    $('stopBtn').disabled = false; $('stopBtn').textContent = '☕ TAKE A BREAK';
  });
  $('resumeBtn').addEventListener('click', async () => {
    try { const r = await fetch('/api/resume', { method: 'POST' }); if (!r.ok) throw new Error(); toast('▶ Back to work!'); await poll(); }
    catch { toast('Could not resume. Delete life\\STOP by hand.'); }
  });

  function apply(s) {
    showStopped(s);
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
      const build = r.headers.get('X-Build');
      if (build && poll.build && build !== poll.build) return location.reload(); // new version pulled: reload
      if (build) poll.build = build;
      apply(await r.json());
      live = true; $('conn').textContent = 'Live'; $('conn').className = 'conn live';
    } catch {
      live = false; $('conn').textContent = 'Offline: start the server'; $('conn').className = 'conn off';
      if (!state) apply(FALLBACK);
    }
  }
  setInterval(() => { const d = new Date(); $('clock').textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }, 1000);
  setInterval(poll, 3000); setInterval(() => state && renderEnergy(state), 30000); setInterval(() => state && ($('nowSince').textContent = state.activity?.since ? 'since ' + ago(state.activity.since) : ''), 30000);
  poll();
  requestAnimationFrame(frame);
})();
