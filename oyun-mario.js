'use strict';
/* LEKO BROS — Katia AI için özgün (kendi tasarımımız) platform oyunu: 30 bölüm (1-1 … 1-30) · her bölümün sonunda boss.
   Kontroller: ← → / A D yürü · ↑ / W / Boşluk zıpla · X / F / Shift ateş topu · mobilde ekrandaki düğmeler.
   Mekanikler: mantar (büyü, tuğla kır) · ateş çiçeği (ateş topu at) · hasar alınca küçül.
   Bölümü bitirince dokun / Enter ile sonrakine geçilir. Dış dosya yok, tek dosya. */
window.startLekoBros = function (host, onExit, startLevel, opts) {
  const SEEDS = (opts && opts.seeds) || null; // sadece test: bölüm üretici tohumlarını değiştirir
  const W = 320, H = 192, T = 16, ROWS = 12, LAVA = 172;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; cv.className = 'mcv';
  const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
  host.appendChild(cv);

  /* ---- dokunmatik düğmeler ---- */
  const pad = document.createElement('div'); pad.className = 'mpad';
  pad.innerHTML = '<div><button data-k="left">◀</button><button data-k="right">▶</button></div><div><button data-k="fire" class="mf">ATEŞ</button><button data-k="jump" class="mj">ZIPLA</button></div>';
  host.appendChild(pad);

  const keys = { left: false, right: false, jump: false, fire: false };
  const KM = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right', ArrowUp: 'jump', w: 'jump', W: 'jump', ' ': 'jump', z: 'jump', Z: 'jump', x: 'fire', X: 'fire', f: 'fire', F: 'fire', Shift: 'fire' };
  let state = 'play', raf = 0, last = 0, acc = 0, alive = true;
  const xT = [];
  const kd = e => {
    if (editOpen) return; // düzenleme panelinde yazı yazılabilsin
    if ((e.key === 'x' || e.key === 'X') && !e.repeat) { // 3 kez hızlıca X: düzenleme modu (sadece Leko modu açıkken)
      const now = Date.now(); xT.push(now); while (xT.length > 3) xT.shift();
      if (xT.length === 3 && now - xT[0] < 1600 && window.lekoEditAllowed && window.lekoEditAllowed()) { xT.length = 0; openEdit(); e.preventDefault(); e.stopPropagation(); return; }
    }
    const k = KM[e.key];
    if (k) { keys[k] = true; e.preventDefault(); e.stopPropagation(); }
    if ((e.key === 'Enter' || e.key === ' ') && (state === 'over' || state === 'win')) advance();
  };
  const ku = e => { if (editOpen) return; const k = KM[e.key]; if (k) { keys[k] = false; e.preventDefault(); e.stopPropagation(); } };
  document.addEventListener('keydown', kd, true); document.addEventListener('keyup', ku, true);
  const pd = e => { const b = e.target.closest('[data-k]'); if (b) { keys[b.dataset.k] = true; e.preventDefault(); sfx(0); } };
  const pu = e => { Object.keys(keys).forEach(k => keys[k] = false); };
  pad.addEventListener('pointerdown', pd); document.addEventListener('pointerup', pu); document.addEventListener('pointercancel', pu);
  cv.addEventListener('pointerdown', () => { if (state === 'over' || state === 'win') advance(); });

  /* ---- ses (küçük bip'ler) ---- */
  let ac = null;
  function sfx(type) {
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume();
      const o = ac.createOscillator(), v = ac.createGain(), t = ac.currentTime;
      const P = { 1: [330, 660, .12, 'square'], 2: [880, 1320, .1, 'square'], 3: [300, 90, .25, 'sawtooth'], 4: [200, 120, .08, 'square'], 5: [523, 1046, .5, 'triangle'], 6: [900, 260, .1, 'sawtooth'], 7: [330, 1320, .35, 'triangle'] }[type];
      if (!P) return;
      o.type = P[3]; o.frequency.setValueAtTime(P[0], t); o.frequency.exponentialRampToValueAtTime(P[1], t + P[2]);
      v.gain.setValueAtTime(.06, t); v.gain.exponentialRampToValueAtTime(.001, t + P[2] + .05);
      o.connect(v); v.connect(ac.destination); o.start(t); o.stop(t + P[2] + .08);
    } catch (e) {}
  }

  /* ---- temalar ---- */
  // gb/gt/gl: zemin gövde/üst/çizgi · bk/bl: tuğla · hd/hh/hs: sert blok · pl: bulut/köprü platformu
  const TH = {
    day:    { bg: 'day',    sky: '#5c94fc', gb: '#b8601c', gt: '#3fae3a', gl: '#2d8a2a', bk: '#c4501b', bl: '#3a1608', hd: '#9aa0a8', hh: '#d6dae0', hs: '#4a4f57' },
    cave:   { bg: 'cave',   sky: '#050510', gb: '#1f5fa0', gt: '#4aa3e8', gl: '#2f7fc0', bk: '#2f7fc0', bl: '#0c2a4a', hd: '#46688f', hh: '#7fa3cc', hs: '#1f3552' },
    sky:    { bg: 'sky',    sky: '#7ec8ff', gb: '#b8601c', gt: '#3fae3a', gl: '#2d8a2a', bk: '#c4501b', bl: '#3a1608', hd: '#9aa0a8', hh: '#d6dae0', hs: '#4a4f57', pl: ['#ffffff', '#b9dcff'] },
    castle: { bg: 'castle', sky: '#140505', gb: '#5a5a64', gt: '#8a8a96', gl: '#3a3a42', bk: '#8a3a22', bl: '#2a0a05', hd: '#6e6e78', hh: '#a8a8b4', hs: '#34343c', lava: 1 },
    night:  { bg: 'night',  sky: '#0a0f2e', gb: '#4a2d86', gt: '#7c5cd1', gl: '#37206a', bk: '#6b3fb0', bl: '#1d0f3d', hd: '#8e8ea8', hh: '#c8c8dc', hs: '#4a4a62', pl: ['#c9b8ff', '#7b62c9'] },
    forest: { bg: 'forest', sky: '#16402f', gb: '#5a3a1c', gt: '#2e8f45', gl: '#1d6a31', bk: '#7a4a22', bl: '#2a1608', hd: '#7d8a74', hh: '#b4c4a8', hs: '#3d4a36' },
    desert: { bg: 'desert', sky: '#f7b86a', gb: '#d19a3e', gt: '#f2d27e', gl: '#b9852c', bk: '#c9692f', bl: '#5a2608', hd: '#b09a78', hh: '#e6d6b2', hs: '#6e5a3a' },
    ice:    { bg: 'ice',    sky: '#b6e0ff', gb: '#6f9fd0', gt: '#eaf7ff', gl: '#a9d2f2', bk: '#8cc3ee', bl: '#35689a', hd: '#8aa6c1', hh: '#dff0ff', hs: '#50718f', pl: ['#ffffff', '#9fcdf2'], slip: 1 },
    volcano:{ bg: 'volcano', sky: '#2a0805', gb: '#43302c', gt: '#7a5a48', gl: '#2a1a16', bk: '#9a3a1a', bl: '#2e0c04', hd: '#6a5a58', hh: '#a89690', hs: '#2e2422', lava: 1 },
    beach:  { bg: 'beach',  sky: '#7fd8ff', gb: '#d9b36a', gt: '#f6e4a8', gl: '#c9a560', bk: '#e0704a', bl: '#5a2210', hd: '#a89a82', hh: '#e8dcc2', hs: '#665a46', pl: ['#ffffff', '#bfe6f5'] },
    mine:   { bg: 'mine',   sky: '#120a06', gb: '#5a3a22', gt: '#8a6a44', gl: '#3a2412', bk: '#9a6a30', bl: '#3a2208', hd: '#7a7a82', hh: '#b4b4bc', hs: '#3c3c44' },
    storm:  { bg: 'storm',  sky: '#2a3350', gb: '#4a4a5a', gt: '#7a8aa0', gl: '#32323e', bk: '#5a6a8a', bl: '#1a2236', hd: '#8a8aa0', hh: '#c8c8dc', hs: '#44445a', pl: ['#dfe6f2', '#8a96b0'] },
    crystal:{ bg: 'crystal', sky: '#1a1038', gb: '#3a2a6a', gt: '#7ad8ff', gl: '#5a9acf', bk: '#6a4ab0', bl: '#241450', hd: '#8a7ac0', hh: '#d8d0ff', hs: '#40306a', pl: ['#b8f0ff', '#6a8ae0'], slip: 1 },
    dragon: { bg: 'dragon', sky: '#0c0204', gb: '#4a3a22', gt: '#c9a23a', gl: '#2a1e0e', bk: '#8a2a1a', bl: '#200806', hd: '#8a7a5a', hh: '#d8c898', hs: '#3a2e1a', pl: ['#ffd98a', '#b8862a'], lava: 1 },
    farm:   { bg: 'day',    sky: '#8fd8ff', gb: '#a8702c', gt: '#7fcf3a', gl: '#4a9a24', bk: '#d0452a', bl: '#4a1408', hd: '#a8a090', hh: '#e8e0c8', hs: '#58503e' },
    swamp:  { bg: 'swamp',  sky: '#1e2f1c', gb: '#3a2f1a', gt: '#6a8a2a', gl: '#44601a', bk: '#6a5a2a', bl: '#241a08', hd: '#6a7a5a', hh: '#a0b090', hs: '#34402c' },
    blizzard:{ bg: 'ice',   sky: '#8aa4c8', gb: '#5a7aa0', gt: '#e8f2ff', gl: '#9ab8dc', bk: '#7a98c0', bl: '#2a4468', hd: '#7a8fa8', hh: '#d0e0f0', hs: '#44566e', pl: ['#ffffff', '#8ab0dc'], slip: 1 },
    candy:  { bg: 'candy',  sky: '#ffd6ef', gb: '#e0709a', gt: '#fff0f6', gl: '#f0a8c8', bk: '#c07af0', bl: '#5a2a8a', hd: '#f0a0c0', hh: '#ffffff', hs: '#b04a7a', pl: ['#fff7a8', '#ffb0d8'] },
    space:  { bg: 'space',  sky: '#04040f', gb: '#3a4058', gt: '#7a88b8', gl: '#262a40', bk: '#5a64a0', bl: '#181c34', hd: '#8a90a8', hh: '#c8d0e8', hs: '#3e4458', pl: ['#9ae6ff', '#4a6ad0'], grav: .2 },
    pyramid:{ bg: 'pyramid', sky: '#f0a860', gb: '#c89440', gt: '#e8c46a', gl: '#a87828', bk: '#d88a3a', bl: '#5a2e08', hd: '#b8a070', hh: '#e8d8a8', hs: '#6a5430' },
    ruins:  { bg: 'ruins',  sky: '#2a2038', gb: '#4a4a3a', gt: '#6a8a4a', gl: '#34402a', bk: '#7a7a60', bl: '#2a2a1e', hd: '#8a8a78', hh: '#c0c0a8', hs: '#40402e' },
    rainbow:{ bg: 'rainbow', sky: '#6ec6ff', gb: '#e89a4a', gt: '#8ae04a', gl: '#5ab02a', bk: '#ff6a8a', bl: '#6a1a30', hd: '#c0b8d8', hh: '#ffffff', hs: '#7a6a98', pl: ['#ffe66a', '#ff8ad0'] },
    king:   { bg: 'dragon', sky: '#08020a', gb: '#3a1a4a', gt: '#e0b030', gl: '#200a2a', bk: '#a02a3a', bl: '#2a0610', hd: '#9a8aaa', hh: '#e0d0f0', hs: '#3a2a4a', pl: ['#ffe08a', '#c0802a'], lava: 1 },
    nforest:{ bg: 'forest', sky: '#0a1a2a', gb: '#2a2a3a', gt: '#3a6a6a', gl: '#1a3a3a', bk: '#4a3a6a', bl: '#150a2a', hd: '#6a7a8a', hh: '#a8b8c8', hs: '#2e3a46' },
    gdesert:{ bg: 'desert', sky: '#ffd070', gb: '#d9a020', gt: '#ffe27a', gl: '#b07a10', bk: '#e0a030', bl: '#6a3a00', hd: '#c8b070', hh: '#fff0b0', hs: '#7a6420' },
    fcastle:{ bg: 'ice',    sky: '#6a88b8', gb: '#4a6080', gt: '#c8e0f8', gl: '#2e4058', bk: '#6a8ab8', bl: '#1e2e48', hd: '#7a90b0', hh: '#d8e8f8', hs: '#3a4c68', pl: ['#e8f4ff', '#7a9cd0'], slip: 1, lava: 1 },
    dspace: { bg: 'space',  sky: '#02020a', gb: '#2a2a40', gt: '#9a5ae0', gl: '#181828', bk: '#4a3a8a', bl: '#120a2a', hd: '#7a78a0', hh: '#c8c0f0', hs: '#34304e', pl: ['#d8a8ff', '#6a3ac0'], grav: .2, lava: 1 },
    dking:  { bg: 'dragon', sky: '#060106', gb: '#2a1030', gt: '#d03a3a', gl: '#160618', bk: '#8a1a2a', bl: '#200408', hd: '#8a7a9a', hh: '#e8d0f0', hs: '#2e1a3a', pl: ['#ff8a5a', '#a02a1a'], lava: 1 },
    finale: { bg: 'finale', sky: '#12020f', gb: '#3a2850', gt: '#a43a6a', gl: '#25143a', bk: '#5a2a7a', bl: '#1a0a2a', hd: '#74688c', hh: '#bfb4d6', hs: '#32284a', pl: ['#ffb0c8', '#a43a6a'], lava: 1 }
  };

  /* ---- bölüm üretici: tohumlu (aynı tohum = hep aynı bölüm); her bölüm test ile geçilebilirliği doğrulandı ---- */
  function mkRng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function gen(h, o) {
    const R = mkRng((SEEDS && SEEDS[lv]) || o.seed), ri = (a, b) => a + Math.floor(R() * (b - a + 1)), cols = h.cols, W = o.w, mix = o.mix || ['n'];
    const pick = () => { let tot = 0; for (const k in W) tot += W[k]; let r = R() * tot; for (const k in W) { r -= W[k]; if (r <= 0) return k; } return 'flat'; };
    h.land(0, cols - 1); h.pow(6, 7);
    const endX = o.end != null ? o.end : cols - 28; let x = o.start || 12;
    const flat = n => { for (let i = 1; i < n; i += 3) if (R() < o.den) h.en(x + i, mix[Math.floor(R() * mix.length)]); x += n; };
    while (x < endX) {
      const k = pick();
      if (k === 'flat') flat(ri(3, 6));
      else if (k === 'pipe') { h.pipe(x, ri(2, 3)); x += 2; flat(4); }
      else if (k === 'wall') { const n = ri(2, 3); h.col(x, n); h.col(x + 1, n); x += 2; flat(4); }
      else if (k === 'stairs') { const n = ri(3, 5); h.stairs(x, n); x += n; flat(4); }
      else if (k === 'pit') { const w = ri(2, 3); h.cut(x, x + w - 1); x += w; flat(4); }
      else if (k === 'bigpit') { h.cut(x, x + 4); h.put(x + 1, 9, 4); h.put(x + 3, 9, 4); x += 5; flat(4); }
      else if (k === 'plat') {
        const L = ri(4, 6); h.row(x, x + L - 1, 7, 2); h.put(x + 1, 7, 3); if (R() < o.pow) h.pow(x + (L >> 1), 7); if (L > 4) h.put(x + L - 2, 7, 3);
        x += L; flat(3);
      } else if (k === 'chain') {
        const m = ri(3, 5); let cx = x + ri(2, 3), r = 10 - ri(0, 1); const pls = [];
        for (let i = 0; i < m; i++) { const w = ri(3, 4); pls.push([cx, w, r]); cx += w + ri(2, 3); r = Math.max(8, Math.min(10, r + ri(-1, 1))); }
        h.cut(x, cx - 1);
        pls.forEach(([px, w, rr], i) => { for (let j = 0; j < w; j++) h.put(px + j, rr, 7); if (i > 0 && i < m - 1 && w >= 3 && R() < o.den) h.en(px + 1, mix[Math.floor(R() * mix.length)], rr); });
        x = cx; flat(4);
      }
    }
    if (o.fin !== false) h.stairs(cols - 22, 7);
  }

  /* ---- bölümler ----
     Zemin üstü satırı 9, zemin 10-11. Karolar: 1 zemin · 2 tuğla · 3 ? blok · 4 sert blok · 5 boru · 6 boş blok · 7 platform.
     h.en(x, tür, satır): 'n' normal, 'f' hızlı, 's' dikenli (üstüne zıplanmaz). */
  const LEVELS = [
    { name: 'ÇİMENLİK', th: 'day', cols: 150, time: 300, run(h) {
      h.ground([[38, 39], [72, 74], [104, 105], [121, 123]]);
      [16, 20, 22, 24].forEach(x => h.put(x, 7, 2)); [18, 23].forEach(x => h.put(x, 7, 3)); h.pow(21, 7); h.put(22, 4, 3);
      h.pipe(30, 2); h.pipe(46, 3); h.pipe(58, 3); h.pipe(90, 2); h.pipe(98, 3);
      h.row(50, 55, 7, 2); h.put(52, 7, 3); h.put(53, 7, 3); h.row(51, 54, 4, 2);
      h.row(66, 70, 6, 2); h.put(68, 6, 3); h.put(70, 6, 3);
      h.row(76, 78, 7, 3);
      h.row(108, 113, 7, 2); h.pow(110, 7);
      h.stairs(128, 8); h.stairs(116, 4);
      [12, 26, 34, 42, 53, 63, 80, 95, 100, 112, 126, 139].forEach(x => h.en(x));
    } },
    { name: 'YERALTI', th: 'cave', cols: 170, time: 320, run(h) {
      h.ground([[28, 29], [55, 57], [84, 85], [108, 110], [132, 133], [146, 148]]);
      [[12, 2], [19, 3], [36, 2], [40, 3], [62, 2], [66, 3], [70, 2], [94, 3], [98, 2], [118, 3], [124, 2]].forEach(([x, n]) => h.pipe(x, n));
      h.row(16, 18, 7, 2); h.pow(17, 7);
      h.row(26, 31, 7, 2); h.put(27, 7, 3); h.put(30, 7, 3);
      h.row(44, 48, 6, 2); h.pow(46, 6);
      h.row(74, 80, 7, 2); h.put(76, 7, 3); h.put(78, 7, 3);
      h.row(100, 104, 7, 2); h.put(102, 7, 3);
      h.row(126, 131, 6, 2); h.pow(128, 6); h.put(130, 6, 3);
      h.row(138, 144, 7, 2); h.put(140, 7, 3); h.put(142, 7, 3);
      h.stairs(152, 6);
      [9, 15, 22, 33, 38, 43, 52, 60, 64, 68, 73, 78, 90, 96, 103, 114, 121, 128, 136, 141, 150].forEach(x => h.en(x));
    } },
    { name: 'GÖKYÜZÜ', th: 'sky', cols: 170, time: 260, run(h) {
      h.land(0, 9);
      // [genişlik, satır, sonraki boşluk, düşman] — düşmanlar sadece 2 karelik boşluktan önceki platformlarda
      const e = h.chain(13, [[4, 10, 2], [3, 9, 2], [3, 8, 3], [5, 9, 2], [3, 7, 3], [4, 8, 2], [2, 9, 3], [4, 8, 2], [3, 6, 2], [5, 7, 2, 's'], [2, 8, 3],
        [4, 9, 2], [3, 8, 2], [5, 7, 2, 'n'], [3, 9, 3], [4, 8, 2], [2, 7, 3], [4, 8, 2], [3, 9, 2], [5, 8, 2, 'n'], [3, 9, 2], [3, 10, 3]]);
      h.land(e, 169);
      h.pow(6, 7); h.put(32, 6, 3); h.put(69, 4, 3); h.put(91, 4, 3); h.put(124, 5, 3); h.pow(e + 3, 7);
      h.en(e + 5); h.en(e + 11, 'f');
    } },
    { name: 'KALE', th: 'castle', cols: 180, time: 300, run(h) {
      h.ground([[22, 24], [44, 46], [70, 72], [96, 100], [124, 127], [154, 156]]);
      h.put(97, 9, 4); h.put(99, 9, 4); h.put(125, 9, 4); h.put(126, 9, 4); // lav üstündeki taşlar
      h.col(14, 2); h.col(30, 3); h.col(31, 3); h.stairs(36, 4);
      h.row(50, 54, 7, 2); h.pow(51, 7); h.put(53, 7, 3);
      h.col(58, 2); h.col(62, 2); h.col(66, 3);
      h.row(76, 80, 6, 2); h.put(78, 6, 3);
      h.stairs(84, 3);
      h.col(104, 3); h.col(108, 2); h.col(112, 3);
      h.row(116, 121, 7, 2); h.pow(118, 7); h.put(120, 7, 3);
      h.stairs(132, 5); h.col(142, 3); h.col(143, 3);
      h.stairs(160, 6);
      [[10], [18, 's'], [27], [33, 's'], [42], [47, 'f'], [56, 'f'], [60, 's'], [64], [74, 'f'], [90, 's'], [93, 'f'], [102, 's'], [106, 'f'], [110, 's'], [114, 'f'],
        [131, 's'], [138, 'f'], [146, 's'], [150, 'f']].forEach(([x, t]) => h.en(x, t));
    } },
    { name: 'SON GECE', th: 'night', cols: 210, time: 420, run(h) {
      h.land(0, 23); h.pipe(10, 2); h.pipe(17, 3);
      h.land(27, 62); h.pipe(32, 2); h.pipe(36, 3); h.pipe(40, 2);
      h.row(44, 49, 7, 2); h.pow(45, 7); h.put(47, 7, 3);
      h.pipe(54, 3); h.pipe(58, 2);
      h.land(66, 92); h.stairs(70, 4); h.row(75, 80, 6, 2); h.pow(77, 6); h.put(79, 6, 3); h.col(84, 3); h.col(88, 2);
      const e = h.chain(96, [[3, 10, 3], [4, 9, 2], [3, 8, 2], [2, 7, 3], [4, 8, 2], [3, 9, 2], [3, 7, 2], [5, 8, 2, 's'], [2, 9, 3], [4, 8, 2], [3, 6, 2], [4, 8, 2, 'n'], [3, 9, 3]]);
      h.land(e, 209); h.pipe(e + 4, 2); h.pipe(e + 9, 3); h.stairs(190, 8);
      [[8], [14, 'f'], [21, 's'], [30], [34, 'f'], [38, 's'], [43, 'f'], [52, 's'], [56, 'f'], [61], [68, 'f'], [74, 's'], [82, 'f'], [86], [91, 's'],
        [e + 2, 'f'], [e + 7, 's'], [e + 12, 'f'], [185]].forEach(([x, t]) => h.en(x, t));
      h.en(46, 'n', 7);
    } },
    { name: 'ORMAN', th: 'forest', cols: 190, time: 340, run(h) {
      h.ground([[40, 41], [75, 77], [110, 111], [140, 142]]);
      [[14, 2], [24, 3], [33, 2], [48, 3], [56, 2], [64, 3], [90, 2], [96, 3], [103, 2], [120, 2], [128, 3]].forEach(([x, n]) => h.pipe(x, n));
      h.row(17, 22, 7, 2); h.pow(19, 7); h.put(21, 7, 3);
      h.row(43, 47, 7, 2); h.put(44, 7, 3); h.put(46, 7, 3);
      h.row(68, 73, 7, 2); h.pow(70, 7); h.put(72, 7, 3);
      h.row(80, 85, 6, 2); h.put(82, 6, 3); h.pow(84, 6);
      h.row(106, 109, 7, 2); h.put(107, 7, 3);
      h.row(131, 137, 7, 2); h.put(133, 7, 3); h.pow(135, 7);
      h.stairs(150, 6); h.stairs(166, 8);
      [[10], [19, 'j'], [28], [37, 'j'], [52], [61, 'j'], [70], [79, 'j'], [87], [93, 'j'], [100], [108, 'j'], [115], [124, 'j'], [134], [146, 'j'], [158], [162, 'j'], [175]].forEach(([x, t]) => h.en(x, t));
    } },
    { name: 'ÇÖL', th: 'desert', cols: 200, time: 330, run(h) {
      h.ground([[22, 24], [38, 40], [56, 58], [74, 76], [92, 94], [110, 112], [128, 130], [146, 148], [160, 162]]);
      [[10, 2], [30, 3], [46, 2], [64, 3], [82, 2], [100, 3], [118, 2], [136, 3], [152, 2]].forEach(([x, n]) => h.pipe(x, n));
      h.row(26, 29, 7, 2); h.pow(27, 7); h.put(28, 7, 3);
      h.row(42, 45, 7, 2); h.put(43, 7, 3); h.put(44, 7, 3);
      h.row(50, 54, 7, 2); h.put(51, 7, 3); h.pow(53, 7);
      h.row(60, 63, 7, 2); h.put(61, 7, 3); h.put(62, 7, 3);
      h.row(68, 72, 7, 2); h.put(69, 7, 3); h.put(71, 7, 3);
      h.row(78, 81, 7, 2); h.pow(79, 7);
      h.row(86, 90, 6, 2); h.put(87, 6, 3); h.put(89, 6, 3);
      h.row(96, 99, 7, 2);
      h.row(104, 108, 7, 2); h.pow(106, 7);
      h.row(114, 117, 7, 2); h.put(115, 7, 3);
      h.row(122, 126, 7, 2); h.put(123, 7, 3); h.put(125, 7, 3);
      h.row(132, 135, 7, 2);
      h.row(140, 144, 6, 2); h.pow(142, 6);
      h.row(155, 158, 7, 2); h.put(156, 7, 3);
      h.stairs(168, 8); h.stairs(180, 5);
      [[14, 'f'], [20], [27, 'j'], [34, 'f'], [43, 'j'], [51, 's'], [55, 'f'], [61, 'j'], [68, 's'], [72, 'f'], [80, 'j'], [87, 'f'], [91, 's'], [97, 'f'], [105, 'j'], [109, 's'],
        [115, 'f'], [123, 'j'], [127, 's'], [133, 'f'], [141, 'j'], [145, 'f'], [150, 'f'], [156, 's'], [164, 'f'], [178, 'j'], [186, 'f']].forEach(([x, t]) => h.en(x, t));
    } },
    { name: 'BUZ', th: 'ice', cols: 200, time: 340, run(h) {
      h.land(0, 44); h.pipe(12, 2); h.pipe(22, 3); h.pipe(32, 2);
      h.row(15, 19, 7, 2); h.put(16, 7, 3); h.pow(17, 7); h.put(18, 7, 3);
      h.row(35, 40, 7, 2); h.put(36, 7, 3); h.put(38, 7, 3);
      const e = h.chain(48, [[4, 10, 2], [3, 9, 2], [4, 10, 2], [3, 9, 3], [4, 8, 2], [3, 9, 2, 'n'], [4, 10, 2], [3, 9, 2], [3, 8, 3], [5, 9, 2, 'n']]);
      h.land(e, 199); h.pipe(e + 6, 2); h.pipe(e + 14, 3); h.cut(e + 24, e + 26); h.cut(e + 44, e + 46);
      h.pow(e + 3, 7); h.put(e + 2, 7, 3);
      h.row(e + 18, e + 22, 7, 2); h.put(e + 19, 7, 3); h.pow(e + 20, 7); h.put(e + 21, 7, 3);
      h.row(e + 28, e + 33, 6, 2); h.put(e + 29, 6, 3); h.put(e + 31, 6, 3);
      h.stairs(e + 36, 4);
      h.row(e + 49, e + 54, 7, 2); h.put(e + 50, 7, 3); h.pow(e + 52, 7);
      h.pipe(e + 60, 2); h.pipe(e + 66, 3); h.stairs(e + 72, 6);
      [[6], [28, 'j'], [38], [42, 'j'], [e + 3], [e + 10, 'j'], [e + 17], [e + 22, 's'], [e + 35, 'j'], [e + 42, 'f'], [e + 48], [e + 56, 'j'], [e + 63], [e + 70, 'f'], [e + 84, 'f']].forEach(([x, t]) => h.en(x, t));
    } },
    { name: 'VOLKAN', th: 'volcano', cols: 200, time: 340, run(h) {
      h.ground([[14, 16], [30, 34], [50, 52], [66, 70], [84, 86], [98, 102], [116, 118], [130, 134], [148, 150], [164, 168]]);
      [31, 33, 67, 69, 99, 101, 131, 133, 165, 167].forEach(x => h.put(x, 9, 4));
      h.col(22, 2); h.col(40, 3); h.col(41, 3); h.stairs(43, 3);
      h.row(18, 21, 7, 2); h.pow(19, 7); h.put(20, 7, 3);
      h.row(54, 58, 7, 2); h.put(55, 7, 3); h.pow(57, 7);
      h.col(60, 2); h.col(63, 3);
      h.row(72, 77, 6, 2); h.put(74, 6, 3); h.pow(76, 6);
      h.stairs(79, 4);
      h.row(88, 94, 7, 2); h.put(90, 7, 3); h.put(92, 7, 3);
      h.row(104, 110, 7, 2); h.pow(106, 7); h.put(108, 7, 3);
      h.col(112, 3); h.col(113, 3);
      h.row(120, 126, 6, 2); h.put(122, 6, 3); h.put(124, 6, 3);
      h.stairs(136, 5); h.col(144, 2);
      h.row(152, 158, 7, 2); h.pow(154, 7); h.put(156, 7, 3);
      h.stairs(170, 8);
      [[8, 'n'], [19, 'f'], [26, 's'], [37, 'f'], [47, 's'], [55, 'j'], [62, 'f'], [73, 's'], [78, 'f'], [89, 'j'], [96, 's'], [105, 'f'], [110, 's'], [115, 'f'], [121, 's'], [127, 'j'],
        [142, 'f'], [146, 's'], [153, 'f'], [160, 's'], [180, 'f'], [186, 's']].forEach(([x, t]) => h.en(x, t));
    } },
    { name: 'KARANLIK KALE', th: 'finale', cols: 260, time: 480, run(h) {
      h.land(0, 59); h.cut(16, 18); h.cut(34, 38); h.cut(52, 54);
      h.put(35, 9, 4); h.put(37, 9, 4);
      h.col(10, 2); h.col(26, 3); h.col(27, 3); h.col(44, 3);
      h.row(20, 24, 7, 2); h.pow(21, 7); h.put(23, 7, 3);
      h.row(46, 50, 7, 2); h.put(47, 7, 3); h.put(49, 7, 3);
      const e = h.chain(62, [[3, 10, 3], [4, 9, 2], [3, 8, 2], [2, 7, 3], [4, 8, 2], [3, 9, 2], [3, 7, 2], [5, 8, 2, 's'], [2, 9, 3], [4, 8, 2], [3, 6, 2], [4, 8, 2, 'n'], [3, 9, 3]]);
      h.land(e, 259); h.pipe(e + 4, 2); h.pipe(e + 9, 3); h.pipe(e + 14, 2);
      h.cut(e + 19, e + 21); h.row(e + 21, e + 26, 7, 2); h.put(e + 22, 7, 3); h.pow(e + 23, 7); h.put(e + 25, 7, 3);
      h.cut(e + 29, e + 31); h.col(e + 35, 3); h.col(e + 36, 3); h.stairs(e + 39, 4);
      h.cut(e + 49, e + 53); h.put(e + 50, 9, 4); h.put(e + 52, 9, 4);
      h.row(e + 57, e + 62, 6, 2); h.put(e + 58, 6, 3); h.pow(e + 60, 6);
      h.cut(e + 67, e + 69); h.pipe(e + 73, 2); h.pipe(e + 79, 3); h.cut(e + 85, e + 87);
      h.stairs(e + 91, 6); h.stairs(e + 99, 8);
      [[8], [13, 'f'], [22, 'j'], [31, 's'], [41, 'f'], [47, 's'], [57, 'f'], [e + 2, 'f'], [e + 7, 's'], [e + 12, 'f'], [e + 18, 'j'], [e + 24, 'f'],
        [e + 32, 's'], [e + 45, 'f'], [e + 47, 's'], [e + 56, 'j'], [e + 64, 'f'], [e + 71, 's'], [e + 76, 'f'], [e + 83, 'j'], [e + 89, 'f'], [e + 108, 's'], [e + 114, 'f']].forEach(([x, t]) => h.en(x, t));
    } },
    { name: 'PLAJ', th: 'beach', cols: 200, time: 340, run(h) {
      h.ground([[18, 20], [36, 38], [54, 56], [72, 74], [90, 92], [108, 110], [126, 128], [144, 146], [162, 164]]);
      [[10, 2], [28, 3], [46, 2], [64, 3], [82, 2], [100, 3], [118, 2], [136, 3], [154, 2]].forEach(([x, n]) => h.pipe(x, n));
      h.row(22, 26, 7, 2); h.pow(23, 7); h.put(25, 7, 3);
      h.row(40, 44, 7, 2); h.put(41, 7, 3); h.put(43, 7, 3);
      h.row(58, 62, 7, 2); h.put(59, 7, 3); h.pow(61, 7);
      h.row(67, 70, 7, 2); h.put(68, 7, 3); h.put(69, 7, 3);
      h.row(76, 80, 7, 2); h.pow(78, 7);
      h.row(86, 89, 7, 2); h.put(87, 7, 3);
      h.row(94, 98, 7, 2); h.put(95, 7, 3); h.put(97, 7, 3);
      h.row(104, 107, 7, 2); h.pow(105, 7);
      h.row(112, 116, 7, 2); h.put(113, 7, 3); h.put(115, 7, 3);
      h.row(122, 125, 7, 2);
      h.row(130, 134, 7, 2); h.pow(132, 7);
      h.row(140, 143, 7, 2); h.put(141, 7, 3);
      h.row(148, 152, 7, 2); h.put(149, 7, 3); h.pow(150, 7);
      h.row(158, 161, 7, 2); h.put(159, 7, 3);
      h.stairs(170, 8); h.stairs(182, 5);
      [[14], [24, 'j'], [32], [41, 'f'], [50, 'j'], [60], [68, 'f'], [78, 'j'], [86], [96, 's'], [104, 'f'], [114, 'j'], [122], [132, 's'], [140, 'f'], [150, 'j'], [158], [166, 'f'], [189, 's']].forEach(([x, t]) => h.en(x, t));
    } },
    { name: 'MADEN', th: 'mine', cols: 210, time: 360, run(h) {
      h.ground([[16, 18], [34, 36], [52, 54], [70, 72], [88, 90], [106, 108], [124, 126], [142, 144], [160, 162], [178, 180]]);
      h.col(10, 2); h.stairs(24, 4); h.col(42, 3); h.col(43, 3); h.stairs(46, 3);
      h.row(56, 60, 7, 2); h.pow(57, 7); h.put(59, 7, 3);
      h.col(64, 2);
      h.row(74, 79, 7, 2); h.put(75, 7, 3); h.pow(77, 7); h.put(78, 7, 3);
      h.col(82, 3); h.col(83, 3);
      h.row(92, 96, 7, 2); h.put(93, 7, 3); h.pow(95, 7);
      h.stairs(98, 4);
      h.row(110, 114, 7, 2); h.put(111, 7, 3); h.put(113, 7, 3);
      h.col(118, 2);
      h.row(128, 134, 7, 2); h.pow(130, 7); h.put(132, 7, 3);
      h.stairs(136, 3);
      h.row(146, 150, 7, 2); h.put(147, 7, 3); h.put(149, 7, 3);
      h.col(154, 3); h.col(155, 3);
      h.row(164, 168, 7, 2); h.pow(165, 7);
      h.stairs(170, 3); h.stairs(184, 8);
      [[6], [13, 'f'], [21, 's'], [30, 'f'], [39, 's'], [50, 'f'], [61, 'j'], [67, 's'], [80, 'f'], [86, 's'], [95, 'j'], [103, 'f'], [112, 's'], [121, 'f'], [131, 'j'], [140, 's'], [148, 'f'], [157, 's'], [166, 'f'], [174, 'j'], [182, 's'], [196, 'f'], [200, 's']].forEach(([x, t]) => h.en(x, t));
    } },
    { name: 'FIRTINA', th: 'storm', cols: 220, time: 340, run(h) {
      h.land(0, 9); h.pow(6, 7);
      const e1 = h.chain(13, [[4, 10, 2], [3, 9, 2], [3, 8, 3], [5, 9, 2, 'f'], [3, 7, 3], [4, 8, 2], [2, 9, 3], [4, 8, 2, 'n'], [3, 6, 2], [5, 7, 2, 's'], [2, 8, 3]]);
      h.land(e1, e1 + 15); h.pow(e1 + 3, 7); h.put(e1 + 2, 7, 3); h.pipe(e1 + 6, 2); h.pipe(e1 + 11, 3);
      const e2 = h.chain(e1 + 19, [[3, 10, 3], [4, 9, 2], [3, 8, 2], [2, 7, 3], [4, 8, 2, 'f'], [3, 9, 2], [3, 7, 2], [5, 8, 2, 's'], [2, 9, 3], [4, 8, 2], [3, 6, 2], [4, 8, 2, 'n'], [3, 9, 3]]);
      h.land(e2, 219); h.pow(e2 + 3, 7); h.put(e2 + 2, 7, 3); h.put(e2 + 4, 7, 3); h.pipe(e2 + 6, 2); h.pipe(e2 + 12, 3); h.pipe(e2 + 18, 2);
      h.cut(e2 + 24, e2 + 26); h.stairs(e2 + 30, 6);
      [[e1 + 3, 'f'], [e1 + 9, 'n'], [e1 + 14, 'j'], [e2 + 8, 'f'], [e2 + 15, 's'], [e2 + 21, 'f'], [e2 + 28, 'n']].forEach(([x, t]) => h.en(x, t));
      h.en(e1 + 13, 'n');
    } },
    { name: 'KRİSTAL', th: 'crystal', cols: 220, time: 360, run(h) {
      h.land(0, 50); h.pipe(12, 2); h.pipe(26, 3); h.pipe(40, 2);
      h.row(15, 20, 7, 2); h.put(16, 7, 3); h.pow(17, 7); h.put(19, 7, 3);
      h.row(30, 36, 7, 2); h.put(31, 7, 3); h.put(33, 7, 3); h.put(35, 7, 3);
      const e = h.chain(54, [[4, 10, 2], [3, 9, 3], [4, 8, 2], [3, 9, 2, 's'], [4, 10, 2], [3, 9, 2], [3, 8, 3], [4, 9, 2, 'n'], [3, 10, 2], [5, 9, 2, 'f']]);
      h.land(e, 219); h.pipe(e + 6, 2); h.pipe(e + 14, 3); h.cut(e + 22, e + 24);
      h.row(e + 26, e + 31, 7, 2); h.put(e + 27, 7, 3); h.pow(e + 28, 7); h.put(e + 30, 7, 3);
      h.stairs(e + 34, 4); h.cut(e + 42, e + 44); h.cut(e + 56, e + 58);
      h.row(e + 60, e + 65, 7, 2); h.put(e + 61, 7, 3); h.pow(e + 62, 7); h.put(e + 64, 7, 3);
      h.pipe(e + 70, 2); h.pipe(e + 76, 3); h.cut(e + 82, e + 84); h.stairs(e + 88, 6);
      [[6], [20, 'j'], [34], [46, 'j'], [e + 3], [e + 10, 'f'], [e + 19, 'j'], [e + 29], [e + 39, 'f'], [e + 48, 's'], [e + 53, 'j'], [e + 67], [e + 73, 'f'], [e + 80, 'j'], [e + 96, 'f']].forEach(([x, t]) => h.en(x, t));
    } },
    { name: 'EJDERHA KALESİ', th: 'dragon', cols: 280, time: 540, run(h) {
      h.land(0, 70); h.cut(14, 16); h.cut(32, 36); h.put(33, 9, 4); h.put(35, 9, 4); h.cut(54, 56);
      h.col(8, 2); h.col(26, 3); h.col(27, 3); h.stairs(40, 4);
      h.row(18, 21, 7, 2); h.pow(19, 7); h.put(20, 7, 3);
      h.row(46, 50, 7, 2); h.put(47, 7, 3); h.put(49, 7, 3);
      h.row(60, 64, 6, 2); h.put(61, 6, 3); h.pow(63, 6);
      const e = h.chain(74, [[3, 10, 3], [4, 9, 2], [3, 8, 2], [2, 7, 3], [4, 8, 2], [3, 9, 2], [3, 7, 2], [5, 8, 2, 's'], [2, 9, 3], [4, 8, 2], [3, 6, 2], [4, 8, 2, 'n'], [3, 9, 3]]);
      h.land(e, 279); h.pipe(e + 4, 2); h.pipe(e + 9, 3); h.pipe(e + 14, 2);
      h.cut(e + 19, e + 21); h.row(e + 21, e + 26, 7, 2); h.put(e + 22, 7, 3); h.pow(e + 23, 7); h.put(e + 25, 7, 3);
      h.cut(e + 29, e + 31); h.col(e + 35, 3); h.col(e + 36, 3); h.stairs(e + 39, 4);
      h.cut(e + 49, e + 53); h.put(e + 50, 9, 4); h.put(e + 52, 9, 4);
      h.row(e + 57, e + 62, 6, 2); h.put(e + 58, 6, 3); h.pow(e + 60, 6);
      h.cut(e + 67, e + 69); h.pipe(e + 73, 2); h.pipe(e + 79, 3); h.cut(e + 85, e + 87);
      h.stairs(e + 91, 6); h.stairs(e + 99, 8);
      [[5], [12, 'f'], [22, 'j'], [30, 's'], [38, 'f'], [44, 's'], [52, 'f'], [58, 'j'], [66, 's'], [e + 2, 'f'], [e + 7, 's'], [e + 12, 'f'], [e + 18, 'j'], [e + 24, 's'],
        [e + 32, 'f'], [e + 45, 's'], [e + 47, 'f'], [e + 56, 'j'], [e + 64, 's'], [e + 71, 'f'], [e + 76, 's'], [e + 83, 'j'], [e + 89, 'f'], [e + 108, 's'], [e + 114, 'f']].forEach(([x, t]) => h.en(x, t));
    } },
    { name: 'ÇİFTLİK', th: 'farm', cols: 180, time: 330, run(h) { gen(h, { seed: 37, w: { flat: 2, pipe: 3, wall: 1, stairs: 1, pit: 2, plat: 3 }, den: .70, mix: ['n', 'n', 'f'], pow: .6 }); } },
    { name: 'BATAKLIK', th: 'swamp', cols: 190, time: 350, run(h) { gen(h, { seed: 74, w: { flat: 1, pipe: 2, wall: 1, stairs: 1, pit: 3, plat: 3, chain: 1 }, den: .80, mix: ['j', 'j', 'n', 's'], pow: .6 }); } },
    { name: 'KAR FIRTINASI', th: 'blizzard', cols: 200, time: 360, run(h) { gen(h, { seed: 111, w: { flat: 1, pipe: 2, wall: 1, stairs: 2, pit: 2, plat: 2, chain: 2 }, den: .75, mix: ['n', 'f', 'j'], pow: .6 }); } },
    { name: 'ŞEKER DİYARI', th: 'candy', cols: 190, time: 340, run(h) { gen(h, { seed: 148, w: { flat: 1, pipe: 2, wall: 2, stairs: 2, pit: 2, plat: 4 }, den: .80, mix: ['n', 'j', 'f'], pow: .8 }); } },
    { name: 'SAHTE KALE', th: 'castle', cols: 210, time: 420, fake: true, run(h) { gen(h, { seed: 185, w: { flat: 1, pipe: 1, wall: 2, stairs: 2, pit: 2, bigpit: 1, plat: 3 }, den: .85, mix: ['n', 'f', 's'], pow: .7 }); } },
    { name: 'UZAY', th: 'space', cols: 210, time: 380, run(h) { gen(h, { seed: 222, w: { flat: 1, pipe: 1, wall: 1, stairs: 1, pit: 2, bigpit: 1, plat: 2, chain: 3 }, den: .75, mix: ['n', 'f', 's'], pow: .6 }); } },
    { name: 'PİRAMİT', th: 'pyramid', cols: 210, time: 370, run(h) { gen(h, { seed: 259, w: { flat: 1, pipe: 1, wall: 2, stairs: 4, pit: 2, plat: 3 }, den: .90, mix: ['s', 'f', 'n', 'j'], pow: .6 }); } },
    { name: 'HARABE', th: 'ruins', cols: 200, time: 380, run(h) { gen(h, { seed: 296, w: { flat: 1, pipe: 1, wall: 3, stairs: 2, pit: 2, bigpit: 1, plat: 3, chain: 1 }, den: .90, mix: ['f', 's', 'j', 'n'], pow: .6 }); } },
    { name: 'GÖKKUŞAĞI', th: 'rainbow', cols: 210, time: 380, run(h) { gen(h, { seed: 333, w: { flat: 1, pipe: 1, wall: 1, stairs: 1, pit: 2, plat: 2, chain: 4 }, den: .80, mix: ['n', 'f', 'j'], pow: .6 }); } },
    { name: 'KRAL KALESİ', th: 'king', cols: 300, time: 620, run(h) { gen(h, { seed: 370, w: { flat: 1, pipe: 2, wall: 2, stairs: 2, pit: 2, bigpit: 2, plat: 3, chain: 2 }, den: .95, mix: ['f', 's', 'j', 'f', 'n'], pow: .7 }); } },
    { name: 'GECE ORMANI', th: 'nforest', cols: 220, time: 380, run(h) { gen(h, { seed: 407, w: { flat: 1, pipe: 2, wall: 2, stairs: 1, pit: 3, plat: 3, chain: 2 }, den: .9, mix: ['j', 's', 'f', 'n'], pow: .6 }); } },
    { name: 'ALTIN ÇÖL', th: 'gdesert', cols: 230, time: 390, run(h) { gen(h, { seed: 444, w: { flat: 1, pipe: 2, wall: 2, stairs: 3, pit: 3, bigpit: 1, plat: 3 }, den: .95, mix: ['f', 's', 'j', 'f'], pow: .6 }); } },
    { name: 'DONMUŞ KALE', th: 'fcastle', cols: 230, time: 400, run(h) { gen(h, { seed: 481, w: { flat: 1, pipe: 1, wall: 2, stairs: 2, pit: 2, bigpit: 2, plat: 2, chain: 2 }, den: .95, mix: ['f', 's', 'j', 'f'], pow: .7 }); } },
    { name: 'DERİN UZAY', th: 'dspace', cols: 240, time: 420, run(h) { gen(h, { seed: 518, w: { flat: 1, pipe: 1, wall: 1, stairs: 1, pit: 2, bigpit: 2, plat: 2, chain: 4 }, den: 1, mix: ['f', 's', 'j', 'f', 'n'], pow: .7 }); } },
    { name: 'KRAL EJDERHA', th: 'dking', cols: 260, time: 460, run(h) { gen(h, { seed: 555, w: { flat: 1, pipe: 2, wall: 2, stairs: 2, pit: 2, bigpit: 3, plat: 3, chain: 3 }, den: 1, mix: ['f', 's', 'j', 'f', 'n', 's'], pow: .8 }); } }
  ];

  /* ---- bölüm durumu ---- */
  let map, enemies, popups, p, cam, score, coins, lives = 3, time, frame;
  let boss = null, bossMsg = 0, bossTxt = '', gateList = [], bshots = [], arenaPows = [], cp = 0, ARS = 0;
  const ARENA = 46;
  const cfgNow = () => ((window.LEKO_GCFG || {})[lv + 1]) || {}; // Leko düzenleme modundan gelen bölüm ayarları (herkese yansır)
  let paused = false, editOpen = false;
  let items = [], fireballs = [], parts = [], pw = 0, keepPw = 0, inv = 0; // pw: 0 küçük · 1 büyük · 2 ateş
  let lv = Math.max(0, Math.min(LEVELS.length - 1, (startLevel | 0) - 1));
  let COLS = 150, FLAGX = 0, th = TH.day, introT = 0, endT = 0, lsScore = 0, lsCoins = 0;
  const BPAL = [['#7c1d6f', '#a52a94', '#f4d03f'], ['#1d4f7c', '#2a7ab8', '#ffe27a'], ['#7c2a1d', '#b84a2a', '#ffd23a'], ['#1d7c4a', '#2ab870', '#ffe27a'], ['#4a4a5a', '#7a7a92', '#ff5a5a'], ['#7c6a1d', '#b89a2a', '#fff6c0']];
  function makeArena(L) {
    const n = lv + 1, final = n === LEVELS.length, gx = COLS - 12, ax = L.cols + 6;
    const put = (x, y, t) => { if (x >= 0 && x < COLS && y >= 0 && y < ROWS) map[y][x] = t; };
    for (let x = L.cols; x < COLS; x++) { put(x, 10, 1); put(x, 11, 1); for (let r = 0; r < 10; r++) put(x, r, 0); }
    for (let r = 2; r <= 9; r++) { put(gx, r, 4); gateList.push([gx, r]); }
    const pp = final ? [8, 12, 16, 20] : [9, 14, 19]; // güç blokları (boss ilerledikçe yenilenir)
    pp.forEach((o, k) => { put(ax + o, 6, 8); arenaPows.push([ax + o, 6]); });
    const pat = ['walk', 'fire']; if (n >= 6) pat.push('stomp'); if (n >= 11) pat.push('summon'); if (n >= 16) pat.push('rain'); if (n >= 21) pat.push('dash');
    if (L.fake) { pat.length = 0; pat.push('walk', 'fire', 'stomp', 'summon'); }
    const sz = final ? 0 : 30 + Math.min(8, Math.floor(n / 3)), hp = Math.max(1, Math.round((final ? 220 : L.fake ? 26 : 10 + 2 * n) * (cfgNow().bossHp || 1)));
    const w = final ? 46 : sz, hh = final ? 44 : sz;
    boss = { x: (gx - 10) * T - w / 2, y: 10 * T - hh, w, h: hh, vx: 0, vy: 0, on: false, hp, max: hp, inv: 0, finv: 0, fl: 0, t: 0, act: false, dead: false, say: 0, ax: ax * T, mx: gx * T - w, cd: 70, atk: null, atkT: 0, phase: 0, air: false,
      spec: { name: final ? 'KRAL EJDERHA' : L.fake ? 'SAHTE BOSS' : L.name + ' BOSSU', pat: final ? ['walk', 'fire', 'stomp', 'summon', 'rain', 'dash'] : pat, fake: !!L.fake, final, pal: BPAL[n % 6], acc: n % 3 } };
  }
  function build() {
    const L = LEVELS[lv]; th = TH[L.th]; COLS = L.cols + ARENA; FLAGX = (COLS - 7) * T; ARS = (L.cols + 1) * T;
    map = [...Array(ROWS)].map(() => new Uint8Array(COLS)); enemies = []; boss = null; bossMsg = 0; gateList = []; bshots = []; arenaPows = [];
    const put = (x, y, t) => { if (x >= 0 && x < COLS && y >= 0 && y < ROWS) map[y][x] = t; };
    const h = {
      put, cols: L.cols,
      row: (a, b, y, t) => { for (let x = a; x <= b; x++) put(x, y, t); },
      land: (a, b) => { for (let x = a; x <= b; x++) { put(x, 10, 1); put(x, 11, 1); } },
      cut: (a, b) => { for (let x = a; x <= b; x++) { put(x, 10, 0); put(x, 11, 0); } },
      pow: (x, y) => put(x, y, 8),
      gate: (x, r0, r1) => { for (let r = r0; r <= r1; r++) { put(x, r, 4); gateList.push([x, r]); } },
      ground: gaps => { for (let x = 0; x < COLS; x++) if (!gaps.some(([a, b]) => x >= a && x <= b)) { put(x, 10, 1); put(x, 11, 1); } },
      pipe: (x, n) => { for (let r = 10 - n; r < 10; r++) { put(x, r, 5); put(x + 1, r, 5); } },
      col: (x, n) => { for (let r = 10 - n; r < 10; r++) put(x, r, 4); },
      stairs: (x, n) => { for (let i = 0; i < n; i++) for (let r = 9 - i; r < 10; r++) put(x + i, r, 4); },
      en: (x, t, r) => { r = r || 10; enemies.push({ x: x * T, y: r * T - 18, w: 12, h: 12, vx: -(t === 'f' ? .8 : t === 's' ? .4 : t === 'j' ? .35 : .45), vy: 0, on: false, alive: true, sq: 0, t: t || 'n', hop: 0, edge: r < 10 || t === 's' }); },
      chain: (x, seq) => { for (const [w, r, gp, et] of seq) { for (let i = 0; i < w; i++) put(x + i, r, 7); if (et) h.en(x + (w >> 1), et, r); x += w + gp; } return x; }
    };
    L.run(h);
    makeArena(L);
    enemies = enemies.filter(e => solidAt(Math.floor(e.x / T), Math.floor((e.y + e.h + 8) / T)));
    const C = cfgNow();
    if (C.den != null && C.den !== 1) {
      if (C.den < 1) enemies = enemies.filter((e, i) => ((i * 0.618) % 1) < C.den);
      else { const cp2 = C.den - 1, n = Math.floor(cp2), fr = cp2 - n, extra = []; enemies.forEach((e, i) => { const cnt = n + (((i * 0.37) % 1) < fr ? 1 : 0); for (let c = 1; c <= cnt; c++) { const q = Object.assign({}, e, { x: e.x + 20 * c * (c % 2 ? 1 : -1) }); if (!solidAt(Math.floor(q.x / T), Math.floor(q.y / T)) && solidAt(Math.floor(q.x / T), Math.floor((q.y + q.h + 8) / T))) extra.push(q); } }); enemies = enemies.concat(extra); }
    }
    if (C.spd != null) enemies.forEach(e => { e.vx *= C.spd; });
    if (C.pow === 0) for (let r = 0; r < ROWS; r++) for (let x = 0; x < COLS; x++) if (map[r][x] === 8) map[r][x] = 6;
    popups = []; items = []; fireballs = []; parts = []; score = score || 0; coins = coins || 0;
  }
  function reset(full, intro) {
    if (full) { score = 0; coins = 0; lives = 3; keepPw = 0; }
    build();
    if (intro) cp = 0;
    p = { x: cp || 2 * T, y: 9 * T - 4, w: 12, h: 14, vx: 0, vy: 0, on: false, dir: 1, held: false, fh: false };
    pw = keepPw; inv = 0; if (pw > 0) { p.h = 24; p.y -= 10; }
    cam = 0; time = cfgNow().time || (LEVELS[lv].time + 80); frame = 0; state = 'play'; endT = 0;
    introT = intro ? 100 : 0; if (intro) { lsScore = score; lsCoins = coins; }
  }
  function advance() { // oyun bitti / bölüm tamam ekranından devam
    if (endT < 40) return; // tuş tekrarı yanlışlıkla geçmesin
    if (state === 'over') { lives = 3; score = lsScore; coins = lsCoins; keepPw = 0; reset(false, true); }
    else if (state === 'win') { if (lv < LEVELS.length - 1) { lv++; reset(false, true); } else { lv = 0; reset(true, true); } } // keepPw bölüm sonunda ayarlanır
  }

  /* ---- fizik ---- */
  const solidAt = (tx, ty) => tx < 0 || tx >= COLS ? true : (ty < 0 || ty >= ROWS) ? false : map[ty][tx] > 0;
  function move(b) {
    const r = { hitX: false, head: null };
    b.x += b.vx;
    let x0 = Math.floor(b.x / T), x1 = Math.floor((b.x + b.w - 1) / T), y0 = Math.floor(b.y / T), y1 = Math.floor((b.y + b.h - 1) / T);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (solidAt(tx, ty)) {
      if (b.vx > 0) b.x = tx * T - b.w; else if (b.vx < 0) b.x = (tx + 1) * T;
      b.vx = 0; r.hitX = true; x0 = Math.floor(b.x / T); x1 = Math.floor((b.x + b.w - 1) / T);
    }
    b.y += b.vy; b.on = false;
    x0 = Math.floor(b.x / T); x1 = Math.floor((b.x + b.w - 1) / T); y0 = Math.floor(b.y / T); y1 = Math.floor((b.y + b.h - 1) / T);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (solidAt(tx, ty)) {
      if (b.vy > 0) { b.y = ty * T - b.h; b.on = true; b.vy = 0; }
      else if (b.vy < 0) { b.y = (ty + 1) * T; b.vy = 0; r.head = [tx, ty]; }
      y0 = Math.floor(b.y / T); y1 = Math.floor((b.y + b.h - 1) / T);
    }
    return r;
  }
  function die() { if (state !== 'play') return; state = 'dead'; p.vy = -5; p.dieT = 70; sfx(3); lives--; keepPw = 0; pw = 0; }
  const hits = b => { for (let ty = Math.floor(b.y / T); ty <= Math.floor((b.y + b.h - 1) / T); ty++) for (let tx = Math.floor(b.x / T); tx <= Math.floor((b.x + b.w - 1) / T); tx++) if (solidAt(tx, ty)) return true; return false; };
  function grow() { // küçükten büyüğe: tavan izin vermezse büyüyemez
    if (p.h > 14) return true;
    p.y -= 10; p.h = 24; if (hits(p)) { p.y += 10; p.h = 14; return false; } return true;
  }
  function shrink() { if (p.h > 14) { p.y += 10; p.h = 14; } }
  function hurt() { // düşmana değince: ateş → büyük → küçük → ölüm
    if (inv > 0) return;
    if (pw >= 2) { pw = 1; inv = 110; sfx(3); }
    else if (pw === 1) { pw = 0; shrink(); inv = 110; sfx(3); }
    else die();
  }
  function collect(it) {
    it.dead = true; sfx(7);
    if (it.t === 'f' && pw >= 1) { pw = 2; score += 1000; }
    else if (pw === 0) { if (grow()) pw = 1; score += 1000; }
    else score += 1000;
    popups.push({ x: it.x, y: it.y - 4, t: 30 });
  }
  function bossHit(dmg, fireDmg) {
    const b = boss; if (!b || b.dead || !b.act) return;
    if (fireDmg) { if (b.finv > 0) return; b.finv = 9; } else { if (b.inv > 0) return; b.inv = 34; }
    b.hp -= dmg; b.fl = 14; score += 100 * dmg; sfx(4);
    if (b.hp <= 0) bossDie();
  }
  function bossDie() {
    const b = boss, sp = b.spec; b.dead = true; b.hp = 0; bossMsg = 300; score += sp.final ? 50000 : sp.fake ? 3000 : 5000; sfx(5);
    bossTxt = sp.final ? 'KRAL EJDERHA YENİLDİ!' : sp.fake ? 'SAHTE BOSS! KARTONMUŞ :)' : 'BOSS YENİLDİ!';
    const cols = sp.fake ? ['#c99a5a', '#a97a3a', '#c99a5a'] : [sp.pal[0], sp.pal[1], sp.pal[2]];
    for (let k = 0; k < (sp.final ? 28 : 14); k++) parts.push({ x: b.x + (k % 5) * (b.w / 5), y: b.y + (k % 4) * (b.h / 4), vx: (k % 5 - 2) * .9, vy: -3 - (k % 3) * .8, t: 90, c: cols[k % 3] });
    bshots = [];
    enemies.forEach(e => { if (e.alive) { e.alive = false; e.sq = 20; } });
    if (sp.fake) enemies.push({ x: b.x + 8, y: b.y + 16, w: 12, h: 12, vx: .9, vy: -3, on: false, alive: true, sq: 0, t: 'n', hop: 0, edge: false });
    gateList.forEach(([gx, gr]) => { map[gr][gx] = 0; });
  }
  function bossShot(k, x, y, vx, vy) { bshots.push({ k, x, y, vx, vy, t: 0, w: k === 'wave' ? 12 : k === 'meteor' ? 8 : 8, h: k === 'wave' ? 8 : k === 'meteor' ? 12 : 8 }); }
  function bossUpdate() {
    const b = boss; if (!b || b.dead) return;
    if (!b.act) { if (Math.abs(b.x - p.x) < 300) { b.act = true; b.say = 160; sfx(3); } return; }
    b.t++; if (b.say > 0) b.say--; if (b.inv > 0) b.inv--; if (b.finv > 0) b.finv--; if (b.fl > 0) b.fl--;
    const sp = b.spec, ratio = b.hp / b.max, r1 = ratio < .5, r2 = ratio < .25, sm = (1 + (1 - ratio) * .5 + (r1 ? .12 : 0) + (sp.final ? .15 : 0)) * (cfgNow().bossAtk || 1);
    const ph = Math.floor((1 - ratio) * 4); if (ph > b.phase) { b.phase = ph; arenaPows.forEach(([x, y]) => { if (map[y][x] === 6) map[y][x] = 8; }); sfx(7); popups.push({ x: p.x, y: p.y - 10, t: 40 }); }
    const pcx = p.x + p.w / 2, bcx = b.x + b.w / 2, dir = pcx > bcx ? 1 : -1, mouth = b.y + b.h * .45;
    if (b.cd > 0) b.cd--;
    if (!b.atk) {
      if (b.on) { b.vx = dir * .5 * sm; if (b.t % Math.max(55, Math.round(120 / sm)) === 0) { b.vy = -5.6; b.vx = dir * 1.5; } }
      if (b.cd <= 0 && sp.pat.length > 1) { b.atk = sp.pat[1 + Math.floor(Math.random() * (sp.pat.length - 1))]; b.atkT = 0; b.air = false; }
    } else {
      const a = b.atk, t = ++b.atkT; let done = false;
      if (a === 'fire') {
        b.vx = 0; if (t === 26) { const nn = 1 + (r1 ? 1 : 0) + (r2 ? 1 : 0) + (sp.final ? 1 : 0); for (let k = 0; k < nn; k++) bossShot('fire', bcx + dir * b.w / 2, k % 2 ? 126 : 149, dir * (1.7 + k * .35) * (sp.final ? 1.2 : 1), 0); sfx(6); }
        if (t > 50 + (sp.final ? 20 : 0)) done = true;
      } else if (a === 'stomp') {
        b.vx = 0; if (t === 24) { b.vy = -7.6; b.vx = dir * Math.min(2.4, Math.abs(pcx - bcx) / 40 + .4); b.air = true; sfx(1); }
        if (b.air && t > 30 && b.on) { bossShot('wave', bcx - 6, 152, -1.7 * sm, 0); bossShot('wave', bcx - 6, 152, 1.7 * sm, 0); if (r1 || sp.final) { bossShot('wave', bcx - 6, 152, -2.6, 0); bossShot('wave', bcx - 6, 152, 2.6, 0); } sfx(3); b.air = false; b.atkT = 100; }
        if (t > 120) done = true;
      } else if (a === 'summon') {
        b.vx = 0; if (t === 22) { const alive = enemies.filter(e => e.alive).length; for (let k = 0; k < 1 + (r1 ? 1 : 0) + (sp.final ? 1 : 0) && alive + k < 5; k++) enemies.push({ x: Math.max(b.ax, Math.min(b.mx, bcx + (k ? 1 : -1) * 50 - 6)), y: 10 * T - 20, w: 12, h: 12, vx: dir * .7, vy: -3, on: false, alive: true, sq: 0, t: k % 2 ? 'f' : 'n', hop: 0, edge: false }); sfx(2); }
        if (t > 48) done = true;
      } else if (a === 'rain') {
        b.vx = 0; const nn = 4 + (r1 ? 2 : 0) + (r2 ? 2 : 0) + (sp.final ? 3 : 0);
        if (t % 11 === 0 && t / 11 <= nn) bossShot('warn', Math.max(b.ax, Math.min(b.mx + b.w, pcx + (Math.random() * 120 - 60))), 150, 0, 0);
        if (t > nn * 11 + 40) done = true;
      } else if (a === 'dash') {
        if (t < 30) { b.vx = 0; b.x += Math.sin(t) * .6; } else if (t === 30) { b.vx = dir * 3.4 * (sp.final ? 1.2 : 1); sfx(3); } else if (t > 30 && (t > 80 || (b.vx === 0))) { done = true; }
      }
      if (done) { b.atk = null; b.cd = Math.max(35, Math.round((125 - (r1 ? 25 : 0) - (r2 ? 20 : 0) - (sp.final ? 25 : 0)) / sm) + Math.floor(Math.random() * 30)); b.vx = 0; }
    }
    b.vy = Math.min(b.vy + .3, 6); const sx = b.vx; move(b); const hitWall = b.vx === 0 && sx !== 0; b.vx = b.atk === 'dash' && hitWall ? 0 : sx;
    b.x = Math.max(b.ax, Math.min(b.mx, b.x)); if (b.atk === 'dash' && (b.x <= b.ax || b.x >= b.mx)) b.vx = 0;
    if (p.x < b.x + b.w && p.x + p.w > b.x && p.y < b.y + b.h && p.y + p.h > b.y) {
      if (p.vy > 0 && p.y + p.h - b.y < 14) { bossHit(2, false); p.vy = -5.4; }
      else { hurt(); if (state !== 'play') return; }
    }
  }
  function shotsUpdate() {
    for (const q of bshots) {
      q.t++;
      if (q.k === 'warn') { if (q.t > 38) { q.dead = true; bossShot('meteor', q.x - 4, -14, 0, 3.6); } continue; }
      q.x += q.vx; q.y += q.vy;
      if (q.k === 'meteor' && q.y > 148) q.dead = true;
      if (q.k === 'fire' && (q.x < 0 || q.x > COLS * T || solidAt(Math.floor(q.x / T), Math.floor(q.y / T)))) q.dead = true;
      if (q.k === 'wave' && (q.t > 160 || q.x < 0 || q.x > COLS * T)) q.dead = true;
      if (!q.dead && p.x < q.x + q.w && p.x + p.w > q.x && p.y < q.y + q.h && p.y + p.h > q.y) { q.dead = true; hurt(); if (state !== 'play') return; }
    }
    bshots = bshots.filter(q => !q.dead);
  }
  function fireEnemy(e) { e.alive = false; e.sq = 20; score += 100; popups.push({ x: e.x, y: e.y - 6, t: 24 }); }
  function bump(tx, ty) {
    if (map[ty][tx] === 3) { map[ty][tx] = 6; coins++; score += 200; popups.push({ x: tx * T + 4, y: ty * T - 4, t: 30 }); sfx(2); }
    else if (map[ty][tx] === 8) { map[ty][tx] = 6; items.push({ x: tx * T + 2, y: ty * T, w: 12, h: 12, vx: .6, vy: 0, on: false, t: pw === 0 ? 'm' : 'f', emerge: 12 }); sfx(4); }
    else if (map[ty][tx] === 2 && pw > 0) { map[ty][tx] = 0; score += 50; sfx(4); for (let k = 0; k < 4; k++) parts.push({ x: tx * T + (k & 1) * 8, y: ty * T + (k >> 1) * 8, vx: (k & 1 ? 1 : -1) * (.8 + k * .15), vy: -3 - (k >> 1), t: 50 }); }
    else sfx(4);
    enemies.forEach(e => { if (e.alive && Math.abs(e.x + e.w / 2 - (tx * T + 8)) < 12 && Math.abs(e.y + e.h - ty * T) < 3) { e.alive = false; e.sq = 20; score += 100; } });
  }
  function update() {
    frame++;
    if (state === 'dead') { p.vy = Math.min(p.vy + .3, 6); p.y += p.vy; if (--p.dieT <= 0) { if (lives > 0) reset(false, false); else { state = 'over'; endT = 0; } } return; }
    if (state === 'over' || state === 'win') { endT++; return; }
    if (state !== 'play') return;
    if (introT > 0) { introT--; return; }
    if (frame % 60 === 0 && --time <= 0) { die(); return; }
    const tv = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    if (tv) p.dir = tv;
    const CF = cfgNow(), sl = CF.slip != null ? CF.slip : th.slip;
    p.vx += (tv * (CF.pspd || 1.7) - p.vx) * (p.on ? (sl ? .05 : .2) : .1);
    if (Math.abs(p.vx) < .05 && !tv) p.vx = 0;
    if (keys.jump && p.on && !p.held) { p.vy = -(CF.jump || 5.7); p.held = true; sfx(1); }
    if (!keys.jump) { p.held = false; if (p.vy < -2.4) p.vy = -2.4; }
    if (keys.fire && !p.fh) { p.fh = true; if (pw === 2 && fireballs.length < 2) { fireballs.push({ x: p.x + (p.dir > 0 ? p.w : -6), y: p.y + 8, w: 6, h: 6, vx: p.dir * 3.4, vy: 0, on: false }); sfx(6); } }
    if (!keys.fire) p.fh = false;
    if (inv > 0) inv--;
    p.vy = Math.min(p.vy + (CF.grav || th.grav || .3), 6);
    const r = move(p);
    if (r.head) bump(r.head[0], r.head[1]);
    if (p.y > H + 24 || (th.lava && p.y + p.h > LAVA + 2)) { die(); return; }
    cam = Math.max(0, Math.min(COLS * T - W, p.x - W / 2 + 10));
    for (const e of enemies) {
      if (e.sq) { e.sq--; continue; }
      if (!e.alive) continue;
      if (Math.abs(e.x - p.x) > 400) continue;
      if (e.t === 'j' && e.on && ++e.hop > 75) { e.vy = -4.4; e.hop = 0; }
      e.vy = Math.min(e.vy + .3, 5); const sx = e.vx; const rr = move(e); if (rr.hitX) e.vx = -sx; else e.vx = sx;
      if (e.edge && e.on && !solidAt(Math.floor((e.vx < 0 ? e.x - 1 : e.x + e.w + 1) / T), Math.floor((e.y + e.h + 1) / T))) e.vx = -e.vx; // uçurumdan dönsün
      if (e.y > H + 20) { e.alive = false; continue; }
      if (p.x < e.x + e.w && p.x + p.w > e.x && p.y < e.y + e.h && p.y + p.h > e.y) {
        if (e.t !== 's' && p.vy > 0 && p.y + p.h - e.y < 10) { e.alive = false; e.sq = 20; p.vy = -3.6; score += 100; sfx(4); popups.push({ x: e.x, y: e.y - 6, t: 24 }); }
        else { hurt(); if (state !== 'play') return; }
      }
    }
    // boss + saldırıları
    bossUpdate(); if (state !== 'play') return;
    shotsUpdate(); if (state !== 'play') return;
    if (bossMsg > 0) bossMsg--;
    if (!cp && p.x > ARS) cp = ARS; // arena kontrol noktası
    // eşyalar (mantar / ateş çiçeği)
    for (const it of items) {
      if (it.emerge > 0) { it.emerge--; it.y -= 1; continue; }
      if (Math.abs(it.x - p.x) > 400) continue;
      if (it.t === 'm') { it.vy = Math.min(it.vy + .3, 5); const sx = it.vx; const rr = move(it); it.vx = rr.hitX ? -sx : sx; if (it.y > H + 20) it.dead = true; }
      if (!it.dead && p.x < it.x + it.w && p.x + p.w > it.x && p.y < it.y + it.h && p.y + p.h > it.y) collect(it);
    }
    items = items.filter(it => !it.dead);
    // ateş topları
    for (const f of fireballs) {
      f.vy = Math.min(f.vy + .28, 4); const sx = f.vx; const rr = move(f); if (rr.hitX) f.dead = true; else f.vx = sx;
      if (f.on) f.vy = -2.7;
      if (f.y > H + 10 || (th.lava && f.y > LAVA) || Math.abs(f.x - p.x) > 280) f.dead = true;
      if (boss && boss.act && !boss.dead && !f.dead && f.x < boss.x + boss.w && f.x + f.w > boss.x && f.y < boss.y + boss.h && f.y + f.h > boss.y) { bossHit(1, true); f.dead = true; }
      for (const e of enemies) if (e.alive && !f.dead && f.x < e.x + e.w && f.x + f.w > e.x && f.y < e.y + e.h && f.y + f.h > e.y) { fireEnemy(e); f.dead = true; sfx(4); }
    }
    fireballs = fireballs.filter(f => !f.dead);
    parts.forEach(q => { q.vy += .3; q.x += q.vx; q.y += q.vy; q.t--; }); parts = parts.filter(q => q.t > 0);
    if (p.x + p.w >= FLAGX) { state = 'win'; endT = 0; score += time * 10; keepPw = pw; sfx(5); }
  }

  /* ---- çizim ---- */
  function tile(t, x, y, tx, ty) {
    if (t === 1) { g.fillStyle = th.gb; g.fillRect(x, y, T, T); if (!map[ty - 1] || !map[ty - 1][tx]) { g.fillStyle = th.gt; g.fillRect(x, y, T, 4); g.fillStyle = th.gl; g.fillRect(x, y + 4, T, 1); } g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x + 7, y + 6, 2, 8); g.fillRect(x + 2, y + 10, 4, 2); }
    else if (t === 2) { g.fillStyle = th.bk; g.fillRect(x, y, T, T); g.fillStyle = th.bl; g.fillRect(x, y + 7, T, 1); g.fillRect(x, y + 15, T, 1); g.fillRect(x + 7, y, 1, 7); g.fillRect(x + 3, y + 8, 1, 7); g.fillRect(x + 11, y + 8, 1, 7); }
    else if (t === 3 || t === 8) { const bl = (frame >> 4) & 1; g.fillStyle = bl ? '#ffd23a' : '#f0a800'; g.fillRect(x, y, T, T); g.fillStyle = '#6b3a00'; g.fillRect(x, y, T, 1); g.fillRect(x, y + 15, T, 1); g.fillRect(x, y, 1, T); g.fillRect(x + 15, y, 1, T); g.font = 'bold 12px monospace'; g.fillText('?', x + 4, y + 13); }
    else if (t === 4) { g.fillStyle = th.hd; g.fillRect(x, y, T, T); g.fillStyle = th.hh; g.fillRect(x, y, T, 2); g.fillRect(x, y, 2, T); g.fillStyle = th.hs; g.fillRect(x, y + 14, T, 2); g.fillRect(x + 14, y, 2, T); }
    else if (t === 5) { const cap = !map[ty - 1] || map[ty - 1][tx] !== 5; g.fillStyle = '#10a53a'; g.fillRect(x, y, T, T); g.fillStyle = '#6fe08a'; g.fillRect(x + 2, y, 3, T); g.fillStyle = '#075a1e'; g.fillRect(x + 13, y, 3, T); if (cap) { g.fillStyle = '#0a7d2b'; g.fillRect(x, y, T, 3); } }
    else if (t === 6) { g.fillStyle = '#7a5a2a'; g.fillRect(x, y, T, T); g.fillStyle = '#4b3515'; g.fillRect(x, y, T, 1); g.fillRect(x, y + 15, T, 1); }
    else if (t === 7) { const c = th.pl || ['#ffffff', '#cfd8e6']; g.fillStyle = c[1]; g.fillRect(x, y + 6, T, 10); g.fillStyle = c[0]; g.fillRect(x, y, T, 8); g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(x + 2, y + 9, T - 4, 3); g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(x, y + 7, T, 1); }
  }
  function hills(col) { g.fillStyle = col; for (let i = -1; i < 8; i++) { const hx = i * 90 - (cam * .3 % 90); g.beginPath(); g.moveTo(hx, 160); g.quadraticCurveTo(hx + 30, 112, hx + 60, 160); g.fill(); } }
  function clouds(col, n) { g.fillStyle = col; for (let i = -1; i < n; i++) { const cx = i * 120 - (cam * .5 % 120) + 20, cy = 26 + (i & 1) * 22; g.beginPath(); g.arc(cx, cy, 10, 0, 7); g.arc(cx + 14, cy + 3, 12, 0, 7); g.arc(cx + 28, cy, 9, 0, 7); g.fill(); } }
  function deco() {
    g.fillStyle = th.sky; g.fillRect(0, 0, W, H);
    if (th.bg === 'day') { hills('#3fae3a'); clouds('#fff', 6); }
    else if (th.bg === 'sky') {
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#4f9dff'); gr.addColorStop(1, '#d6f0ff'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      clouds('rgba(255,255,255,.85)', 6); g.save(); g.translate(60, 70); clouds('rgba(255,255,255,.55)', 5); g.restore();
    } else if (th.bg === 'cave') {
      g.fillStyle = '#0b1a33'; g.fillRect(0, 0, W, 18);
      g.fillStyle = '#0f2447'; const base = Math.floor(cam * .8 / 40);
      for (let k = -1; k < 10; k++) { const gi = base + k, sx = gi * 40 - cam * .8, hh = 10 + ((gi * 37) & 15); g.beginPath(); g.moveTo(sx, 17); g.lineTo(sx + 8, 17 + hh); g.lineTo(sx + 16, 17); g.fill(); }
      g.fillStyle = '#0a1830'; for (let k = -1; k < 6; k++) { const px = k * 70 - (cam * .35 % 70) + 20; g.fillRect(px, 70, 10, 90); }
    } else if (th.bg === 'castle') {
      g.fillStyle = '#220b0b'; const off = -(cam * .5 % 32);
      for (let yy = 0; yy < H; yy += 16) { g.fillRect(0, yy, W, 1); for (let xx = off - 32; xx < W; xx += 32) g.fillRect(xx + (((yy >> 4) & 1) ? 16 : 0), yy, 1, 16); }
      g.fillStyle = '#05010a'; for (let k = -1; k < 4; k++) { const wx = k * 110 - (cam * .5 % 110) + 50; g.fillRect(wx, 40, 14, 26); g.beginPath(); g.arc(wx + 7, 40, 7, Math.PI, 0); g.fill(); }
      g.fillStyle = '#e8410f'; g.fillRect(0, LAVA, W, H - LAVA); g.fillStyle = '#ffb02e';
      for (let k = 0; k < 42; k++) g.fillRect(k * 8 - (cam % 8), LAVA + Math.round(Math.sin((k + frame / 9) * .9) * 2), 5, 2);
    } else if (th.bg === 'forest') {
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#0d2a1f'); gr.addColorStop(1, '#2a6a45'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.fillStyle = '#0f3523'; for (let k = -1; k < 9; k++) { const tx = k * 56 - (cam * .35 % 56) + 10; g.fillRect(tx + 8, 70, 8, 100); g.beginPath(); g.moveTo(tx, 100); g.lineTo(tx + 12, 40); g.lineTo(tx + 24, 100); g.fill(); g.beginPath(); g.moveTo(tx - 4, 130); g.lineTo(tx + 12, 70); g.lineTo(tx + 28, 130); g.fill(); }
      g.fillStyle = '#1a5a38'; for (let k = -1; k < 6; k++) { const tx = k * 90 - (cam * .6 % 90) + 30; g.beginPath(); g.moveTo(tx, 160); g.lineTo(tx + 14, 110); g.lineTo(tx + 28, 160); g.fill(); }
      g.fillStyle = '#e8ff9a'; for (let i = 0; i < 14; i++) { const fx = (i * 53 + frame * (.15 + (i % 3) * .05)) % 330, fy = 40 + (i * 37) % 110 + Math.sin((frame + i * 20) / 20) * 6; if (((frame >> 4) + i) % 5) g.fillRect(fx, fy, 2, 2); }
    } else if (th.bg === 'desert') {
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#f08a4b'); gr.addColorStop(.6, '#f7c27a'); gr.addColorStop(1, '#fbe0a6'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.fillStyle = '#fff4c2'; g.beginPath(); g.arc(240, 52, 20, 0, 7); g.fill();
      g.fillStyle = '#d9954a'; for (let i = -1; i < 6; i++) { const hx = i * 110 - (cam * .25 % 110); g.beginPath(); g.moveTo(hx, 160); g.quadraticCurveTo(hx + 50, 100, hx + 110, 160); g.fill(); }
      g.fillStyle = '#b87a30'; for (let i = -1; i < 5; i++) { const hx = i * 140 - (cam * .5 % 140) + 30; g.fillRect(hx + 8, 126, 6, 34); g.fillRect(hx, 134, 4, 10); g.fillRect(hx, 140, 10, 3); g.fillRect(hx + 18, 130, 4, 8); g.fillRect(hx + 14, 136, 8, 3); }
    } else if (th.bg === 'ice') {
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#7fb8ee'); gr.addColorStop(1, '#e4f4ff'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.fillStyle = '#c9e4fa'; for (let i = -1; i < 5; i++) { const hx = i * 120 - (cam * .2 % 120); g.beginPath(); g.moveTo(hx, 160); g.lineTo(hx + 50, 70); g.lineTo(hx + 120, 160); g.fill(); }
      g.fillStyle = '#fff'; for (let i = -1; i < 5; i++) { const hx = i * 120 - (cam * .2 % 120); g.beginPath(); g.moveTo(hx + 50, 70); g.lineTo(hx + 38, 92); g.lineTo(hx + 62, 92); g.fill(); }
      g.fillStyle = '#fff'; for (let i = 0; i < 40; i++) { const fx = ((i * 41 + frame * (.4 + (i % 4) * .15) - cam * .3) % 330 + 330) % 330, fy = (i * 23 + frame * (.6 + (i % 3) * .2)) % 190; g.fillRect(fx, fy, i % 3 ? 1 : 2, i % 3 ? 1 : 2); }
    } else if (th.bg === 'swamp') {
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#13200f'); gr.addColorStop(1, '#4a5a2a'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.fillStyle = '#1c3018'; for (let i = -1; i < 7; i++) { const tx = i * 70 - (cam * .3 % 70) + 14; g.fillRect(tx + 6, 30, 6, 130); g.beginPath(); g.arc(tx + 9, 44, 20, 0, 7); g.fill(); }
      g.fillStyle = '#2a4224'; g.fillRect(0, 138, W, 22); g.fillStyle = '#3c5a2e'; for (let k = 0; k < 20; k++) g.fillRect(k * 18 - ((cam * .6) % 18), 140 + (k % 3) * 5, 10, 1);
      g.fillStyle = '#5a7a30'; for (let i = -1; i < 12; i++) { const rx = i * 40 - (cam * .7 % 40) + 6; g.fillRect(rx, 124, 2, 36); g.fillRect(rx + 4, 130, 2, 30); }
      g.fillStyle = 'rgba(190,210,170,.12)'; g.fillRect(0, 100, W, 40);
      g.fillStyle = '#d8ff7a'; for (let i = 0; i < 12; i++) { const fx = (i * 61 + frame * .2) % 330, fy = 60 + (i * 31) % 80 + Math.sin((frame + i * 17) / 18) * 5; if (((frame >> 4) + i) % 4) g.fillRect(fx, fy, 2, 2); }
    } else if (th.bg === 'candy') {
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#ffb8e0'); gr.addColorStop(1, '#fff0fa'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      clouds('rgba(255,255,255,.85)', 6);
      const lc = ['#ff5a9a', '#7a5af0', '#35c8b0', '#ffb02e']; for (let i = -1; i < 6; i++) { const lx = i * 80 - (cam * .35 % 80) + 30, c = lc[(i + 20) % 4]; g.fillStyle = '#fff'; g.fillRect(lx + 7, 110, 3, 50); g.fillStyle = c; g.beginPath(); g.arc(lx + 8, 100, 16, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(lx + 8, 100, 9, 0, 5); g.stroke(); g.beginPath(); g.arc(lx + 8, 100, 3, 0, 5); g.stroke(); g.lineWidth = 1; }
    } else if (th.bg === 'space') {
      g.fillStyle = '#04040f'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#fff'; for (let i = 0; i < 70; i++) { if (((frame >> 4) + i * 3) % 17 === 0) continue; const sx = (((i * 89) % 340) - cam * (.05 + (i % 3) * .05) % 340 + 340) % 340 - 10, sy = (i * 31) % 180; g.fillRect(sx, sy, i % 7 ? 1 : 2, i % 7 ? 1 : 2); }
      const px = 250 - (cam * .04 % 400); g.fillStyle = '#c0583a'; g.beginPath(); g.arc(px, 60, 26, 0, 7); g.fill(); g.fillStyle = '#e0805a'; g.beginPath(); g.arc(px - 6, 52, 8, 0, 7); g.fill(); g.strokeStyle = '#ffd8a0'; g.beginPath(); g.ellipse(px, 60, 40, 8, -.3, 0, 7); g.stroke();
      g.fillStyle = '#3a6ad0'; g.beginPath(); g.arc(60 - (cam * .02 % 400), 130, 12, 0, 7); g.fill();
    } else if (th.bg === 'pyramid') {
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#e8683a'); gr.addColorStop(.6, '#f5b868'); gr.addColorStop(1, '#fbe0a6'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.fillStyle = '#ffe9a0'; g.beginPath(); g.arc(70, 50, 18, 0, 7); g.fill();
      for (let i = -1; i < 4; i++) { const px = i * 170 - (cam * .2 % 170) + 40, hh = 60 + ((i + 10) % 3) * 14; g.fillStyle = '#c2763a'; g.beginPath(); g.moveTo(px, 160); g.lineTo(px + hh, 160 - hh); g.lineTo(px + hh * 2, 160); g.fill(); g.fillStyle = '#9a5528'; g.beginPath(); g.moveTo(px + hh, 160 - hh); g.lineTo(px + hh * 2, 160); g.lineTo(px + hh, 160); g.fill(); }
      g.fillStyle = '#d9954a'; for (let i = -1; i < 6; i++) { const hx = i * 110 - (cam * .45 % 110); g.beginPath(); g.moveTo(hx, 160); g.quadraticCurveTo(hx + 50, 138, hx + 110, 160); g.fill(); }
    } else if (th.bg === 'ruins') {
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#1a1228'); gr.addColorStop(1, '#4a4a6a'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.fillStyle = '#e8e4c8'; g.beginPath(); g.arc(240, 38, 14, 0, 7); g.fill();
      for (let i = -1; i < 6; i++) { const cx = i * 80 - (cam * .35 % 80) + 20, hh = 60 + ((i + 20) * 29 % 50); g.fillStyle = '#34344e'; g.fillRect(cx, 160 - hh, 12, hh); g.fillRect(cx - 3, 160 - hh, 18, 4); g.fillRect(cx - 3, 156, 18, 4); g.fillStyle = '#2a4a2a'; g.fillRect(cx + 1, 160 - hh + 4, 2, 18 + (i & 3) * 6); }
      g.fillStyle = '#b8e8ff'; for (let i = 0; i < 10; i++) { const fx = (i * 67 + frame * .25) % 330, fy = 40 + (i * 29) % 100 + Math.sin((frame + i * 19) / 20) * 4; if (((frame >> 4) + i) % 3) g.fillRect(fx, fy, 2, 2); }
    } else if (th.bg === 'rainbow') {
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#4fa8ff'); gr.addColorStop(1, '#eaf8ff'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      const rc = ['#ff3b3b', '#ff9a2e', '#ffe135', '#4cd964', '#35b6ff', '#5a5af0', '#b05af0']; const rx = 160 - (cam * .12 % 320); g.lineWidth = 4; for (let k = 0; k < 7; k++) { g.strokeStyle = rc[k]; g.beginPath(); g.arc(rx, 190, 150 - k * 4, Math.PI, 0); g.stroke(); g.beginPath(); g.arc(rx + 320, 190, 150 - k * 4, Math.PI, 0); g.stroke(); } g.lineWidth = 1;
      clouds('rgba(255,255,255,.9)', 6);
    } else if (th.bg === 'beach') {
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#4fb8f5'); gr.addColorStop(1, '#d8f4ff'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.fillStyle = '#fff6b0'; g.beginPath(); g.arc(70, 40, 16, 0, 7); g.fill();
      clouds('rgba(255,255,255,.8)', 5);
      g.fillStyle = '#2f9fe0'; g.fillRect(0, 118, W, 42); g.fillStyle = '#7fd0f8'; for (let k = 0; k < 24; k++) g.fillRect(k * 16 - ((cam * .3 + frame * .5) % 16), 122 + (k % 3) * 9 + Math.round(Math.sin((k + frame / 12) * .8)), 8, 1);
      g.fillStyle = '#2a7a3a'; for (let i = -1; i < 5; i++) { const px = i * 130 - (cam * .45 % 130) + 40; g.fillRect(px + 6, 112, 3, 48); for (let a = 0; a < 5; a++) { g.beginPath(); g.moveTo(px + 7, 112); g.quadraticCurveTo(px + 7 + (a - 2) * 9, 96 + Math.abs(a - 2) * 4, px + 7 + (a - 2) * 13, 114 + Math.abs(a - 2) * 3); g.lineTo(px + 7 + (a - 2) * 11, 112 + Math.abs(a - 2) * 3); g.fill(); } }
    } else if (th.bg === 'mine') {
      g.fillStyle = '#120a06'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#1e1209'; for (let k = -1; k < 8; k++) { const bx = k * 64 - (cam * .5 % 64); g.fillRect(bx, 0, 6, H); g.fillRect(bx, 24, 64, 5); }
      g.fillStyle = '#2a1a0c'; for (let k = -1; k < 6; k++) { const bx = k * 90 - (cam * .3 % 90) + 30; g.fillRect(bx, 100, 20, 60); g.fillRect(bx + 4, 90, 12, 10); }
      for (let k = -1; k < 5; k++) { const tx = k * 100 - (cam * .5 % 100) + 24, fl = (frame >> 3) & 1; g.fillStyle = 'rgba(255,170,60,.12)'; g.beginPath(); g.arc(tx + 3, 60, 22 + fl * 2, 0, 7); g.fill(); g.fillStyle = '#6a4a22'; g.fillRect(tx + 2, 62, 2, 10); g.fillStyle = fl ? '#ffd23a' : '#ff9a1a'; g.fillRect(tx + 1, 56, 4, 6); }
    } else if (th.bg === 'storm') {
      const flash = ((frame + 60) % 420) < 5;
      g.fillStyle = flash ? '#cfd8f0' : th.sky; g.fillRect(0, 0, W, H);
      g.fillStyle = flash ? '#aab4d0' : '#1c2238'; for (let i = -1; i < 7; i++) { const cx = i * 80 - (cam * .35 % 80) + 20; g.beginPath(); g.arc(cx, 20, 26, 0, 7); g.arc(cx + 28, 26, 22, 0, 7); g.arc(cx + 52, 18, 24, 0, 7); g.fill(); }
      g.fillStyle = '#3a4668'; clouds('rgba(58,70,104,.8)', 6);
      if (flash) { g.strokeStyle = '#fff6a0'; g.lineWidth = 2; g.beginPath(); const bx = 90 + ((frame / 420 | 0) * 97) % 140; g.moveTo(bx, 30); g.lineTo(bx - 8, 70); g.lineTo(bx + 4, 72); g.lineTo(bx - 10, 120); g.stroke(); g.lineWidth = 1; }
      g.fillStyle = 'rgba(180,200,255,.5)'; for (let i = 0; i < 50; i++) { const rx = ((i * 37 + frame * 1.5 - cam * .5) % 340 + 340) % 340, ry = (i * 53 + frame * 6) % 190; g.fillRect(rx, ry, 1, 5); }
    } else if (th.bg === 'crystal') {
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#0d0624'); gr.addColorStop(1, '#2a1a5a'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      const cols = ['#4a3a9a', '#2e8ad0', '#9a4ac0']; for (let i = -1; i < 8; i++) { const cx = i * 56 - (cam * .35 % 56) + 10, hh = 40 + ((i + 20) * 37 % 40); g.fillStyle = cols[(i + 30) % 3]; g.beginPath(); g.moveTo(cx, 160); g.lineTo(cx + 6, 160 - hh); g.lineTo(cx + 14, 160); g.fill(); g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.moveTo(cx + 6, 160 - hh); g.lineTo(cx + 10, 160); g.lineTo(cx + 6, 160); g.fill(); }
      g.fillStyle = '#b8f0ff'; for (let i = 0; i < 26; i++) { if (((frame >> 3) + i * 5) % 11 < 4) continue; g.fillRect((i * 83 + 17) % 320, (i * 47) % 150, 2, 2); }
    } else if (th.bg === 'volcano' || th.bg === 'finale' || th.bg === 'dragon') {
      const fin = th.bg === 'finale';
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, fin ? '#0a0010' : '#1a0300'); gr.addColorStop(1, fin ? '#4a0f3a' : '#7a1a05'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      if (fin) { g.fillStyle = '#fff'; for (let i = 0; i < 40; i++) { if (((frame >> 3) + i * 7) % 31 === 0) continue; const sx = (((i * 97) % 340) - cam * .06 % 340 + 340) % 340 - 10, sy = (i * 29) % 110; g.fillRect(sx, sy, i % 5 ? 1 : 2, i % 5 ? 1 : 2); } g.fillStyle = '#ff4d6d'; g.beginPath(); g.arc(250, 44, 18, 0, 7); g.fill(); g.fillStyle = '#12020f'; g.beginPath(); g.arc(257, 40, 15, 0, 7); g.fill(); }
      g.fillStyle = fin ? '#1d0a2e' : '#2a0c05'; for (let i = -1; i < 5; i++) { const hx = i * 130 - (cam * .3 % 130); g.beginPath(); g.moveTo(hx, 172); g.lineTo(hx + 50, fin ? 84 : 76); g.lineTo(hx + 62, fin ? 84 : 76); g.lineTo(hx + 120, 172); g.fill(); if (!fin) { g.fillStyle = '#ff7a1a'; g.fillRect(hx + 51, 76, 10, 3); g.fillStyle = '#2a0c05'; } }
      g.fillStyle = '#ffb02e'; for (let i = 0; i < 12; i++) { const ex = (i * 71 + 13) % 320, ey = 172 - ((frame * (.5 + (i % 4) * .2) + i * 40) % 130); g.fillRect(ex, ey, 2, 2); }
      g.fillStyle = '#e8410f'; g.fillRect(0, LAVA, W, H - LAVA); g.fillStyle = '#ffb02e';
      for (let k = 0; k < 42; k++) g.fillRect(k * 8 - (cam % 8), LAVA + Math.round(Math.sin((k + frame / 9) * .9) * 2), 5, 2);
    } else if (th.bg === 'night') {
      g.fillStyle = '#fff'; for (let i = 0; i < 44; i++) { if (((frame >> 3) + i * 7) % 29 === 0) continue; const sx = (((i * 97) % 340) - cam * .08 % 340 + 340) % 340 - 10, sy = (i * 29) % 120; g.fillRect(sx, sy, i % 5 ? 1 : 2, i % 5 ? 1 : 2); }
      g.fillStyle = '#fff3c4'; g.beginPath(); g.arc(262, 40, 16, 0, 7); g.fill(); g.fillStyle = th.sky; g.beginPath(); g.arc(269, 36, 14, 0, 7); g.fill();
      hills('#1a1450');
    }
  }
  function player() {
    if (inv > 0 && state === 'play' && ((frame >> 2) & 1)) return; // hasar sonrası yanıp sönme
    const x = Math.round(p.x - cam), y = Math.round(p.y), bh = p.h - 14, fire = pw === 2;
    g.save(); g.translate(x + 6, y); g.scale(p.dir, 1); g.translate(-6, 0);
    const run = p.on && Math.abs(p.vx) > .3 ? (frame >> 3) & 1 : 0;
    g.fillStyle = fire ? '#f4f4f4' : '#2a5bd7'; g.fillRect(2, 0, 8, 3); g.fillRect(6, 2, 6, 2);   // şapka
    if (fire) { g.fillStyle = '#e11d48'; g.fillRect(2, 2, 6, 1); }
    g.fillStyle = '#f2c18f'; g.fillRect(2, 3, 9, 5); g.fillStyle = '#111'; g.fillRect(8, 4, 2, 2); // yüz + göz
    g.fillStyle = '#5a3412'; g.fillRect(1, 6, 3, 2);                                    // saç
    g.fillStyle = '#fff'; g.fillRect(1, 8, 10, 3 + (bh ? 3 : 0));                       // gömlek
    g.fillStyle = fire ? '#dc2626' : '#1e3f9a'; g.fillRect(2, 8, 8, 4 + bh); g.fillStyle = '#ffd23a'; g.fillRect(3, 9, 1, 1); g.fillRect(8, 9, 1, 1);
    g.fillStyle = '#4a2a10'; const ly = 12 + bh;
    if (!p.on) { g.fillRect(0, ly, 5, 2); g.fillRect(7, ly - 1, 5, 3); } else if (run) { g.fillRect(1, ly, 4, 2); g.fillRect(7, ly, 4, 2); } else { g.fillRect(2, ly, 4, 2); g.fillRect(6, ly, 4, 2); }
    g.restore();
  }
  function drawBoss() {
    const b = boss, sp = b.spec; const x0 = Math.round(b.x - cam), y0 = Math.round(b.y); if (x0 < -60 || x0 > W + 60) return;
    const fl = b.fl > 0 && ((frame >> 1) & 1), wob = b.act ? Math.round(Math.sin(frame / 6)) : 0, tele = b.atk && b.atkT < 28 && ((frame >> 2) & 1);
    g.save();
    if (sp.final) {
      g.translate(x0 + (b.vx < 0 ? 0 : 0), y0 + wob);
      const c = fl ? '#fff' : tele ? '#ff8a5a' : '#1f6a5a', c2 = fl ? '#fff' : '#2a9a7a', face = b.vx < 0 || (boss.act && p.x < b.x) ? -1 : 1;
      if (face < 0) { g.translate(46, 0); g.scale(-1, 1); }
      g.fillStyle = '#12302a'; g.beginPath(); g.moveTo(8, 14); g.lineTo(-10, 0); g.lineTo(-4, 18); g.lineTo(-12, 26); g.lineTo(8, 30); g.fill(); // kanat
      g.fillStyle = c; g.fillRect(6, 12, 34, 30); g.fillRect(10, 6, 30, 10); g.fillStyle = c2; g.fillRect(6, 12, 34, 4);
      g.fillStyle = '#e8d8a0'; g.fillRect(14, 26, 20, 16); g.fillStyle = '#c8b880'; for (let k = 0; k < 4; k++) g.fillRect(14, 29 + k * 4, 20, 1);
      g.fillStyle = '#f4d03f'; g.beginPath(); g.moveTo(12, 8); g.lineTo(8, -6); g.lineTo(18, 6); g.lineTo(26, -10); g.lineTo(30, 6); g.lineTo(40, -4); g.lineTo(38, 10); g.fill(); // boynuz/taç
      const fl2 = (frame >> 2) & 1; g.fillStyle = fl2 ? '#ff7a1a' : '#e8410f'; g.beginPath(); g.moveTo(14, 4); g.lineTo(18, -14 - fl2 * 3); g.lineTo(24, 2); g.lineTo(30, -16 + fl2 * 3); g.lineTo(34, 4); g.fill();
      g.fillStyle = '#fff'; g.fillRect(28, 14, 9, 7); g.fillStyle = '#e11d48'; g.fillRect(32, 15, 4, 5); g.fillStyle = '#111'; g.fillRect(27, 11, 12, 2); // göz + kaş
      g.fillStyle = '#111'; g.fillRect(30, 26, 14, 8); g.fillStyle = '#fff'; for (let k = 0; k < 4; k++) g.fillRect(31 + k * 3, 26, 2, 3);
      if (b.atk === 'fire' && b.atkT > 10) { g.fillStyle = '#ffb02e'; g.fillRect(44, 28, 6, 4); }
      g.fillStyle = '#12302a'; g.fillRect(10, 40, 10, 4); g.fillRect(28, 40, 10, 4); g.fillStyle = c2; g.beginPath(); g.moveTo(6, 30); g.lineTo(-8, 34); g.lineTo(6, 38); g.fill(); // kuyruk
    } else {
      g.translate(x0, y0 + b.h); g.scale(b.w / 30, b.h / 30); g.translate(0, -30 + wob);
      const col = fl ? '#fff' : tele ? '#ff9a3a' : sp.pal[0], hi = fl ? '#fff' : sp.pal[1], gold = sp.pal[2];
      g.fillStyle = col; g.fillRect(1, 6, 28, 24); g.fillRect(4, 2, 22, 6); g.fillStyle = hi; g.fillRect(1, 6, 28, 3);
      if (sp.acc === 0) { g.fillStyle = gold; g.fillRect(6, -2, 3, 6); g.fillRect(13, -5, 4, 9); g.fillRect(21, -2, 3, 6); g.fillRect(6, 3, 18, 2); }
      else if (sp.acc === 1) { g.fillStyle = '#eee'; g.beginPath(); g.moveTo(4, 4); g.lineTo(0, -8); g.lineTo(9, 3); g.fill(); g.beginPath(); g.moveTo(26, 4); g.lineTo(30, -8); g.lineTo(21, 3); g.fill(); }
      else { g.fillStyle = gold; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(5 + k * 6, 3); g.lineTo(8 + k * 6, -6); g.lineTo(11 + k * 6, 3); g.fill(); } }
      g.fillStyle = '#fff'; g.fillRect(6, 11, 7, 6); g.fillRect(17, 11, 7, 6); g.fillStyle = '#e11d48'; g.fillRect(9, 13, 3, 4); g.fillRect(18, 13, 3, 4);
      g.fillStyle = '#111'; g.fillRect(5, 9, 9, 2); g.fillRect(16, 9, 9, 2);
      g.fillStyle = '#111'; g.fillRect(7, 21, 16, 6); g.fillStyle = '#fff'; for (let k = 0; k < 4; k++) g.fillRect(8 + k * 4, 21, 2, 3);
      if (sp.fake) {
        const rr = b.hp / b.max;
        if (rr < .67) { g.fillStyle = '#c99a5a'; g.fillRect(20, 17, 9, 12); g.fillStyle = '#a97a3a'; for (let k = 0; k < 4; k++) g.fillRect(20, 19 + k * 3, 9, 1); }
        if (rr < .34) { g.fillStyle = '#c99a5a'; g.fillRect(1, 6, 12, 14); g.fillStyle = '#a97a3a'; for (let k = 0; k < 5; k++) g.fillRect(1, 8 + k * 3, 12, 1); g.fillStyle = '#fff'; g.fillRect(5, 11, 3, 3); g.fillStyle = '#111'; g.fillRect(6, 12, 1, 2); }
        g.fillStyle = '#e8d8a0'; g.fillRect(11, -1, 9, 2);
      } else { g.fillStyle = gold; g.fillRect(12, 28, 6, 2); }
    }
    g.restore();
    if (b.say > 0 && ((b.say >> 3) & 1 || b.say < 110)) { g.fillStyle = '#fff'; g.fillRect(x0 - 14, y0 - 34, 76, 12); g.fillStyle = '#111'; g.font = 'bold 8px monospace'; g.textAlign = 'center'; g.fillText(sp.final ? 'BEN KRALIM!' : sp.fake ? 'BEN BOSSUM!' : 'GEÇEMEZSİN!', x0 + 24, y0 - 25); g.textAlign = 'left'; }
  }
  function drawShots() {
    for (const q of bshots) {
      const x = Math.round(q.x - cam), y = Math.round(q.y), f = (frame >> 1) & 1;
      if (q.k === 'warn') { if ((q.t >> 2) & 1) { g.fillStyle = '#ff3b3b'; g.beginPath(); g.moveTo(x - 6, 156); g.lineTo(x + 6, 156); g.lineTo(x, 146); g.fill(); } }
      else if (q.k === 'meteor') { g.fillStyle = '#ff7a1a'; g.fillRect(x + 1, y - 10, 6, 10); g.fillStyle = '#6a3a1a'; g.fillRect(x, y, 8, 12); g.fillStyle = '#ffd23a'; g.fillRect(x + 2, y + 2, 3, 4); }
      else if (q.k === 'wave') { g.fillStyle = f ? '#ff7a1a' : '#e8410f'; g.fillRect(x, y, 12, 8); g.fillStyle = '#ffd23a'; g.fillRect(x + 3, y + 3 + f, 6, 4); g.fillRect(x + 5, y, 2, 3); }
      else { g.fillStyle = '#e11d48'; g.fillRect(x, y + 1, 8, 6); g.fillRect(x + 1, y, 6, 8); g.fillStyle = f ? '#ffd23a' : '#ff7a1a'; g.fillRect(x + 2, y + 2, 4, 4); }
    }
  }
  function itemSprite(it) {
    const x = Math.round(it.x - cam), y = Math.round(it.y);
    if (it.t === 'm') { g.fillStyle = '#e11d48'; g.beginPath(); g.arc(x + 6, y + 6, 6, Math.PI, 0); g.fill(); g.fillRect(x, y + 5, 12, 2); g.fillStyle = '#fff'; g.fillRect(x + 2, y + 2, 3, 3); g.fillRect(x + 8, y + 3, 2, 2); g.fillStyle = '#f2d9a8'; g.fillRect(x + 3, y + 7, 6, 5); g.fillStyle = '#111'; g.fillRect(x + 4, y + 8, 1, 2); g.fillRect(x + 7, y + 8, 1, 2); }
    else { const b = (frame >> 3) & 1; g.fillStyle = '#16a34a'; g.fillRect(x + 5, y + 6, 2, 6); g.fillRect(x + 1, y + 9, 4, 2); g.fillRect(x + 7, y + 9, 4, 2); g.fillStyle = b ? '#ff7a1a' : '#e11d48'; g.fillRect(x + 1, y + 2, 10, 5); g.fillRect(x + 3, y, 6, 9); g.fillStyle = b ? '#ffd23a' : '#fff'; g.fillRect(x + 4, y + 3, 4, 3); }
  }
  const EC = { n: ['#7c3aed', '#6d28d9', '#2e1065'], f: ['#f97316', '#c2410c', '#7c2d12'], s: ['#dc2626', '#991b1b', '#450a0a'], j: ['#22c55e', '#15803d', '#052e16'] };
  function draw() {
    deco();
    const c0 = Math.floor(cam / T), c1 = c0 + Math.ceil(W / T) + 1;
    items.forEach(itemSprite);
    for (let ty = 0; ty < ROWS; ty++) for (let tx = c0; tx <= c1 && tx < COLS; tx++) { const t = map[ty][tx]; if (t) tile(t, tx * T - Math.round(cam), ty * T, tx, ty); }
    // bayrak direği
    const fx = FLAGX - Math.round(cam);
    g.fillStyle = '#e8e8e8'; g.fillRect(fx + 6, 3 * T, 3, 7 * T); g.fillStyle = '#ffd23a'; g.beginPath(); g.arc(fx + 7, 3 * T - 2, 4, 0, 7); g.fill();
    g.fillStyle = state === 'win' ? '#22c55e' : '#e11d48'; g.beginPath(); g.moveTo(fx + 9, 3 * T + 2); g.lineTo(fx + 25, 3 * T + 8); g.lineTo(fx + 9, 3 * T + 14); g.fill();
    for (const e of enemies) {
      if (!e.alive && !e.sq) continue;
      const x = Math.round(e.x - cam), y = Math.round(e.y), c = EC[e.t] || EC.n;
      if (x < -20 || x > W + 20) continue;
      if (!e.alive) { g.fillStyle = c[1]; g.fillRect(x, y + 8, 12, 4); continue; }
      const w = (frame >> 3) & 1;
      if (e.t === 's') { g.fillStyle = '#fde68a'; for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(x + k * 4, y + 1); g.lineTo(x + k * 4 + 2, y - 4); g.lineTo(x + k * 4 + 4, y + 1); g.fill(); } }
      g.fillStyle = c[0]; g.beginPath(); g.arc(x + 6, y + 6, 6, Math.PI, 0); g.fill(); g.fillRect(x, y + 6, 12, 4);
      g.fillStyle = '#fff'; g.fillRect(x + 2, y + 4, 3, 3); g.fillRect(x + 7, y + 4, 3, 3); g.fillStyle = '#111'; g.fillRect(x + 3, y + 5, 1, 2); g.fillRect(x + 8, y + 5, 1, 2);
      g.fillStyle = c[2]; g.fillRect(x + (w ? 0 : 2), y + 10, 4, 2); g.fillRect(x + (w ? 8 : 6), y + 10, 4, 2);
    }
    if (boss && !boss.dead) drawBoss();
    drawShots();
    for (const f of fireballs) { const fx = Math.round(f.x - cam), fy = Math.round(f.y); g.fillStyle = '#e11d48'; g.fillRect(fx, fy + 1, 6, 4); g.fillRect(fx + 1, fy, 4, 6); g.fillStyle = (frame >> 1) & 1 ? '#ffd23a' : '#ff7a1a'; g.fillRect(fx + 2, fy + 2, 2, 2); }
    parts.forEach(q => { g.fillStyle = q.c || th.bk; g.fillRect(Math.round(q.x - cam), Math.round(q.y), 6, 6); g.fillStyle = q.c ? '#6b4a22' : th.bl; g.fillRect(Math.round(q.x - cam), Math.round(q.y) + 5, 6, 1); });
    if (state !== 'dead' || p.dieT > 0) player();
    g.fillStyle = '#fff'; g.font = 'bold 8px monospace';
    popups = popups.filter(q => --q.t > 0); popups.forEach(q => g.fillText('+', q.x - Math.round(cam), q.y - (30 - q.t) * .6));
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, 0, W, 14);
    g.fillStyle = '#fff'; g.font = 'bold 9px monospace';
    g.fillText('LEKO ' + String(score).padStart(6, '0') + '   ● x' + String(coins).padStart(2, '0') + '   1-' + (lv + 1) + '   ♥ ' + Math.max(0, lives) + '   ⏱ ' + Math.max(0, time), 6, 10);
    if (boss && boss.act && !boss.dead) { const bb = boss, bw = 200, bx = (W - bw) / 2; g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(bx - 2, 16, bw + 4, 14); g.fillStyle = '#400'; g.fillRect(bx, 18, bw, 6); g.fillStyle = bb.spec.final ? '#ffb02e' : '#e11d48'; g.fillRect(bx, 18, Math.round(bw * Math.max(0, bb.hp) / bb.max), 6); g.fillStyle = '#fff'; g.font = 'bold 7px monospace'; g.textAlign = 'center'; g.fillText(bb.spec.name, W / 2, 28); g.textAlign = 'left'; }
    if (Object.keys(cfgNow()).length) { g.fillStyle = '#7ee0ff'; g.font = 'bold 7px monospace'; g.fillText('AYARLI', 6, 22); }
    if (bossMsg > 0) { g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(0, 150, W, 26); g.fillStyle = '#ffd23a'; g.font = 'bold 11px monospace'; g.textAlign = 'center'; g.fillText(bossTxt, W / 2, 167); g.textAlign = 'left'; }
    if (pw > 0) { g.fillStyle = pw === 2 ? '#ffd23a' : '#e11d48'; g.font = 'bold 8px monospace'; g.textAlign = 'right'; g.fillText(pw === 2 ? 'ATEŞ  [X]' : 'BÜYÜK', W - 4, 10); }
    g.textAlign = 'center';
    if (introT > 0) {
      g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(0, 14, W, H - 14); g.fillStyle = '#fff';
      g.font = 'bold 16px monospace'; g.fillText('DÜNYA 1-' + (lv + 1), W / 2, 86);
      g.font = 'bold 11px monospace'; g.fillText(LEVELS[lv].name, W / 2, 106);
      g.font = '9px monospace'; g.fillText('♥ x' + lives + '   ·   bölüm ' + (lv + 1) + ' / ' + LEVELS.length, W / 2, 126);
    }
    if (state === 'over' || state === 'win') {
      const fin = state === 'win' && lv === LEVELS.length - 1;
      g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(0, 60, W, 70); g.fillStyle = '#fff'; g.font = 'bold 16px monospace';
      g.fillText(state === 'over' ? 'OYUN BİTTİ' : fin ? 'TEBRİKLER! HEPSİ BİTTİ' : 'BÖLÜM TAMAM!', W / 2, 88);
      g.font = 'bold 10px monospace';
      g.fillText('Skor: ' + score + '   ·   ' + (state === 'over' ? 'Bu bölümü tekrar dene' : fin ? 'Baştan başla' : 'Sonraki bölüm') + ': dokun / Enter', W / 2, 108);
    }
    g.textAlign = 'left';
  }
  function loop(ts) {
    if (!alive) return;
    if (!last) last = ts; acc += Math.min(100, ts - last); last = ts;
    while (acc >= 1000 / 60) { if (!paused) update(); acc -= 1000 / 60; }
    draw(); raf = requestAnimationFrame(loop);
  }
  /* ---- düzenleme modu paneli ---- */
  const FIELDS = [
    ['den', 'Düşman sayısı çarpanı', 1, .1], ['spd', 'Düşman hızı çarpanı', 1, .1], ['bossHp', 'Boss can çarpanı', 1, .1], ['bossAtk', 'Boss saldırı hızı', 1, .1],
    ['time', 'Süre (sn)', null, 10], ['grav', 'Yerçekimi', .3, .02], ['jump', 'Zıplama gücü', 5.7, .1], ['pspd', 'Oyuncu hızı', 1.7, .1]
  ];
  let edPanel = null, draft = null;
  function goLevel(n) { lv = Math.max(0, Math.min(LEVELS.length - 1, n - 1)); keepPw = 0; cp = 0; lives = 3; reset(false, true); }
  function openEdit() {
    if (edPanel) return; editOpen = true; paused = true; Object.keys(keys).forEach(k => keys[k] = false);
    draft = JSON.parse(JSON.stringify(window.LEKO_GCFG || {}));
    const d = document.createElement('div'); d.className = 'medit';
    d.innerHTML = '<div class="mehd"><b>DÜZENLEME MODU</b><span>Kaydedince herkese yansır · boş = varsayılan</span></div>' +
      '<label>Bölüm <select id="meLv">' + LEVELS.map((L, i) => '<option value="' + (i + 1) + '">1-' + (i + 1) + ' ' + L.name + '</option>').join('') + '</select></label>' +
      '<div class="megrid">' + FIELDS.map(([k, t, def]) => '<label>' + t + '<input type="number" step="any" data-k="' + k + '" placeholder="' + (def == null ? 'varsayılan' : def) + '"></label>').join('') +
      '<label>Kaygan zemin<select data-k="slip"><option value="">varsayılan</option><option value="1">açık</option><option value="0">kapalı</option></select></label>' +
      '<label>Güç blokları (mantar/çiçek)<select data-k="pow"><option value="">varsayılan</option><option value="0">kapalı (zor)</option></select></label></div>' +
      '<div class="mebt"><button type="button" id="meSave">KAYDET (HERKESE)</button><button type="button" id="meGo">KAYDET + BÖLÜME GİT</button><button type="button" id="meRst">BU BÖLÜMÜ SIFIRLA</button><button type="button" id="meX">KAPAT</button></div><div class="mest" id="meSt"></div>';
    document.body.appendChild(d); edPanel = d;
    const sel = d.querySelector('#meLv'), st = d.querySelector('#meSt');
    const inputs = [...d.querySelectorAll('[data-k]')];
    const load = () => { const c = draft[sel.value] || {}; inputs.forEach(i => { i.value = c[i.dataset.k] != null ? c[i.dataset.k] : ''; }); };
    const grab = () => { const c = {}; inputs.forEach(i => { if (i.value !== '' && isFinite(+i.value)) c[i.dataset.k] = +i.value; }); if (Object.keys(c).length) draft[sel.value] = c; else delete draft[sel.value]; };
    sel.value = String(lv + 1); load();
    let last = sel.value; sel.onchange = () => { const nv = sel.value; sel.value = last; grab(); sel.value = nv; last = nv; load(); };
    const save = async go => {
      grab(); st.textContent = 'Kaydediliyor…';
      window.LEKO_GCFG = JSON.parse(JSON.stringify(draft)); // bu cihazda hemen geçerli
      try {
        const r = window.gameCfgSave ? await window.gameCfgSave(draft) : null;
        st.textContent = r && r.status === 200 ? 'Kaydedildi: herkese yansıyacak (en geç ~30 sn).' : 'Sunucuya kaydedilemedi: ' + ((r && r.j && r.j.error && r.j.error.message) || 'bağlantı yok') + ' (sadece bu cihazda geçerli)';
      } catch (er) { st.textContent = 'Sunucuya ulaşılamadı (sadece bu cihazda geçerli).'; }
      if (go) { const n = +sel.value; closeEdit(); goLevel(n); }
    };
    d.querySelector('#meSave').onclick = () => save(false); d.querySelector('#meGo').onclick = () => save(true);
    d.querySelector('#meRst').onclick = () => { inputs.forEach(i => { i.value = ''; }); st.textContent = 'Bu bölüm varsayılana döndü: KAYDET ile onayla.'; };
    d.querySelector('#meX').onclick = closeEdit;
  }
  function closeEdit() { if (edPanel) { edPanel.remove(); edPanel = null; } editOpen = false; paused = false; Object.keys(keys).forEach(k => keys[k] = false); }

  reset(true, true); raf = requestAnimationFrame(loop);
  return {
    stop() {
      alive = false; cancelAnimationFrame(raf);
      document.removeEventListener('keydown', kd, true); document.removeEventListener('keyup', ku, true);
      document.removeEventListener('pointerup', pu); document.removeEventListener('pointercancel', pu);
      closeEdit(); try { ac && ac.close(); } catch (e) {} cv.remove(); pad.remove();
    },
    _state: () => ({ p, state, score, coins, lives, enemies, map, lv, COLS, FLAGX, time, th, pw, items, fireballs, inv, keepPw, boss, gateList, bshots, cp }), _keys: keys, _goLevel: goLevel, _edit: openEdit, _pw: n => { pw = n; keepPw = n; if (n > 0 && p.h < 24) { p.h = 24; p.y -= 10; } }
  };
};
