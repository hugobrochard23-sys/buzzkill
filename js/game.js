'use strict';
// Cœur du jeu : mouches, input, score/combo, rendu canvas, game feel.
const Game = (() => {
  const cv = document.getElementById('c'), ctx = cv.getContext('2d');
  let W = 0, H = 0, dpr = 1, bg, stain, curtain;
  let MAX_PARTS = 220, lowfx = false, fontFam = 'sans-serif', ftAvg = 16, ftN = 0;
  const S = {
    mode: 'idle',            // idle | tuto | play | ending | over
    env: ENVS.kitchen, t: 0, elapsed: 0, timeLeft: 0, timeMax: CFG.roundTime,
    score: 0, combo: 0, maxCombo: 0, kills: 0, taps: 0, hits: 0, golden: 0, bees: 0, boss: false,
    flies: [], parts: [], texts: [], swats: [], chain: [], splats: [],
    shake: 0, freeze: 0, ts: 1, tsT: 0, flash: 0, flashCol: '#f33', zoom: 0,
    spawnCd: 0, waves: 0, idleCd: 0, usedContinue: false, lastTick: 0, event: null,
  };
  const ev = { onHud: null, onEnd: null, onTutoDone: null, onAskContinue: null };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ---------- Layout / décor ----------
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    bg = layer(); stain = layer(); curtain = layer();
    buildEnv();
  }
  function layer() { const c = document.createElement('canvas'); c.width = W * dpr; c.height = H * dpr; const x = c.getContext('2d'); x.scale(dpr, dpr); return c; }
  const hideRect = () => ({ x: W * .56, y: 0, w: W * .44, h: H * .52 });

  function buildEnv() {
    const g = bg.getContext('2d'), id = S.mode === 'tuto' ? 'black' : S.env.id;
    g.clearRect(0, 0, W, H);
    const cc = curtain.getContext('2d'); cc.clearRect(0, 0, W, H);
    if (id === 'black') { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); return; }
    const emoji = (s, x, y, size) => { g.font = `${size}px serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s, x, y); };
    if (id === 'kitchen') {
      g.fillStyle = '#ffe3b0'; g.fillRect(0, 0, W, H);
      g.strokeStyle = 'rgba(180,120,60,.25)'; g.lineWidth = 2;
      for (let x = 0; x < W; x += 56) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H * .5); g.stroke(); }
      for (let y = 0; y < H * .5; y += 56) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      // table à carreaux vichy
      const ty = H * .5; g.fillStyle = '#ff6b5e'; g.fillRect(0, ty, W, H - ty);
      g.fillStyle = 'rgba(255,255,255,.55)';
      for (let y = ty; y < H; y += 44) for (let x = ((y - ty) / 44 % 2) * 44; x < W; x += 88) g.fillRect(x, y, 44, 44);
      g.fillStyle = INK; g.fillRect(0, ty - 5, W, 5);
      S.env.spots.forEach(([sx, sy], i) => emoji(['🍰', '🍕', '🍉'][i], sx * W, sy * H, 64));
      emoji('🍳', W * .15, H * .2, 54); emoji('🕰️', W * .8, H * .18, 54);
    } else if (id === 'bathroom') {
      g.fillStyle = '#c4eaf3'; g.fillRect(0, 0, W, H);
      g.strokeStyle = 'rgba(40,120,150,.25)'; g.lineWidth = 2;
      for (let x = 0; x < W; x += 48) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
      for (let y = 0; y < H; y += 48) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      g.fillStyle = '#8fc9d8'; g.fillRect(0, H * .78, W, H * .22); g.fillStyle = INK; g.fillRect(0, H * .78 - 5, W, 5);
      emoji('🛁', W * .25, H * .88, 90); emoji('🪞', W * .22, H * .2, 80); emoji('🧼', W * .75, H * .8, 50);
      const r = hideRect();   // rideau de douche : dessiné PAR-DESSUS les mouches
      cc.fillStyle = '#8b6bff'; cc.fillRect(r.x, r.y, r.w, r.h);
      cc.fillStyle = 'rgba(255,255,255,.35)';
      for (let x = r.x; x < r.x + r.w; x += 34) cc.fillRect(x + 6, r.y, 12, r.h);
      cc.fillStyle = INK; cc.fillRect(r.x, r.y + r.h - 5, r.w, 5); cc.fillRect(r.x - 4, r.y, 4, r.h);
      cc.font = '16px sans-serif'; cc.fillStyle = '#fff'; cc.textAlign = 'center'; cc.fillText('🫧 ils se cachent 🫧', r.x + r.w / 2, r.y + r.h / 2);
    } else {
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#8fdcff'); gr.addColorStop(.55, '#d8f4ff'); gr.addColorStop(.56, '#6fcf4a'); gr.addColorStop(1, '#3f9f2e');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.fillStyle = '#ffe14d'; g.beginPath(); g.arc(W * .8, H * .12, 40, 0, 7); g.fill();
      g.fillStyle = '#fff'; for (let x = 0; x < W; x += 36) { g.fillRect(x, H * .46, 24, H * .12); }
      g.fillStyle = INK; g.fillRect(0, H * .5, W, 6);
      S.env.spots.forEach(([sx, sy], i) => emoji(['🌻', '🍉'][i], sx * W, sy * H, 72));
      emoji('🌷', W * .5, H * .9, 56);
    }
  }

  // ---------- Flux de jeu ----------
  function reset(mode) {
    Object.assign(S, { mode, t: 0, elapsed: 0, timeLeft: CFG.roundTime, timeMax: CFG.roundTime, score: 0, combo: 0, maxCombo: 0, kills: 0, taps: 0, hits: 0,
      golden: 0, bees: 0, boss: false, flies: [], parts: [], texts: [], swats: [], chain: [], splats: [], shake: 0, freeze: 0, ts: 1, flash: 0, spawnCd: .5, waves: 0, usedContinue: false, lastTick: 99 });
    stain.getContext('2d').clearRect(0, 0, W, H);
  }
  function setEnv(id) { S.env = ENVS[id] || ENVS.kitchen; buildEnv(); }
  function idle() { reset('idle'); S.idleCd = 0; buildEnv(); }
  function startRound() {
    reset('play'); buildEnv();
    Analytics.log('round_start', { env: S.env.id, lvl: Save.level() });
    ev.onHud && ev.onHud(true);
  }
  function startTuto() {
    reset('tuto'); buildEnv();
    const f = spawn('normal', true); f.x = W / 2; f.y = H * .55; f.tx = W / 2; f.ty = H * .55; f.tuto = true; f.life = 1e9;
  }

  // ---------- Mouches ----------
  function pickType() {
    const lvl = Save.level(), e = S.elapsed, id = S.env.id;
    if (lvl >= 2 && e > 4 && Math.random() < .045 && !S.flies.some(f => f.type === 'golden')) return 'golden';
    const w = [['normal', 10]];
    if (lvl >= 2 && e > 5) w.push(['fast', 4]);
    if (lvl >= 3 && e > 8) w.push(['armored', 3], ['bee', id === 'garden' ? 4 : 2]);
    if (lvl >= 4 && e > 8) w.push(['ghost', id === 'bathroom' ? 6 : 3]);
    if (lvl >= 5 && e > 10) w.push(['bomb', 2]);
    let t = w.reduce((a, b) => a + b[1], 0) * Math.random();
    for (const [k, v] of w) { if ((t -= v) <= 0) return k; }
    return 'normal';
  }
  function spawn(type, inside) {
    const sp = FLY[type], side = (Math.random() * 4) | 0, m = sp.r + 20;
    let x, y;
    if (inside) { x = rnd(60, W - 60); y = rnd(120, H - 80); }
    else if (side === 0) { x = -m; y = rnd(110, H - 60); } else if (side === 1) { x = W + m; y = rnd(110, H - 60); }
    else if (side === 2) { x = rnd(40, W - 40); y = -m; } else { x = rnd(40, W - 40); y = H + m; }
    const f = { type, x, y, vx: 0, vy: 0, tx: x, ty: y, tcd: 0, hp: sp.hp, maxHp: sp.hp, r: sp.r, age: 0, life: sp.life * rnd(.9, 1.15), leaving: false,
      entering: !inside, sq: 0, hit: 0, alpha: 1, ph: rnd(0, 6.28), fuse: 0 };
    newTarget(f);
    S.flies.push(f); return f;
  }
  function newTarget(f) {
    const sp = S.env.spots;
    if (sp && Math.random() < .55) { const s = sp[(Math.random() * sp.length) | 0]; const a = rnd(0, 6.28), d = rnd(30, 90); f.tx = s[0] * W + Math.cos(a) * d; f.ty = s[1] * H + Math.sin(a) * d; }
    else { f.tx = rnd(50, W - 50); f.ty = rnd(110, H - 50); }
    f.tcd = rnd(.8, 2.2);
  }
  function speedMul() { return S.env.speed * (S.mode === 'tuto' ? .45 : S.mode === 'idle' ? .6 : 1 + Math.min(.55, S.elapsed / 70) + Save.level() * .008); }

  function updateFly(f, dt) {
    const sp = FLY[f.type]; f.age += dt; f.sq = Math.max(0, f.sq - dt * 6); f.hit = Math.max(0, f.hit - dt);
    if (!f.leaving && f.age > f.life && f.type !== 'boss' && S.mode === 'play') { f.leaving = true; }
    let speed = sp.speed * speedMul();
    if (f.leaving) {
      const ax = f.x < W / 2 ? -1 : 1, ay = f.y < H / 2 ? -1 : 1;
      f.tx = f.x + ax * 400; f.ty = f.y + ay * 100; speed *= 1.8;
    } else {
      f.tcd -= dt; const d = Math.hypot(f.tx - f.x, f.ty - f.y);
      if (f.tcd <= 0 || d < 18) newTarget(f);
    }
    let dx = f.tx - f.x, dy = f.ty - f.y; const d = Math.hypot(dx, dy) || 1;
    // vol erratique : composante perpendiculaire sinusoïdale
    const w = Math.sin(f.age * 7 + f.ph) * .55;
    const dirx = dx / d - dy / d * w, diry = dy / d + dx / d * w;
    f.vx += (dirx * speed - f.vx) * Math.min(1, dt * 5); f.vy += (diry * speed - f.vy) * Math.min(1, dt * 5);
    f.x += f.vx * dt; f.y += f.vy * dt;
    if (f.type === 'ghost') f.alpha = .5 + .5 * Math.sin(f.age * 3.2) > .45 ? 1 : .18;
    if (f.type === 'bomb') f.fuse += dt;
    if (f.entering && f.x > 0 && f.x < W && f.y > 0 && f.y < H) f.entering = false;
    f.out = f.x < -70 || f.x > W + 70 || f.y < -70 || f.y > H + 70;
  }
  function tappable(f) {
    if (f.entering || f.out) return false;
    if (f.type === 'ghost' && f.alpha < .5) return false;
    if (S.env.hide) { const r = hideRect(); if (f.x > r.x && f.y < r.y + r.h) return false; }
    return true;
  }

  // ---------- Input ----------
  function onTap(x, y) {
    Sfx.unlock();
    if (S.mode === 'over' || S.mode === 'ending') return;
    Sfx.tap(); S.swats.push({ x, y, t: 0 }); S.swats.push({ x, y, t: 0, ring: true, small: true });
    let best = null, bd = 1e9;
    for (const f of S.flies) {
      if (!tappable(f)) continue;
      // Le doigt vise où la mouche ÉTAIT : on teste aussi sa position projetée (latence tactile ~50 ms)
      const d = Math.min(Math.hypot(f.x - x, f.y - y), Math.hypot(f.x + f.vx * .05 - x, f.y + f.vy * .05 - y)) - f.r;
      if (d < CFG.hitSlop && d < bd) { bd = d; best = f; }
    }
    if (S.mode === 'play') S.taps++;
    if (best) hitFly(best, false);
    else if (S.mode === 'play') missTap(x, y);
    else Hap.tap();
  }
  function missTap(x, y) {
    Hap.miss(); Sfx.miss();
    if (S.combo >= 5) Sfx.comboBreak();
    if (S.combo >= 3) text(x, y - 30, 'RATÉ', '#ff6b5e', 30);
    S.combo = 0; S.timeLeft -= CFG.missPenalty; S.shake = Math.max(S.shake, 3); S.flash = .22; S.flashCol = '#ff3b3b'; hud(true);
  }

  function hitFly(f, chained) {
    const sp = FLY[f.type];
    if (f.type === 'bee') { return beeHit(f); }
    f.hp--; f.sq = 1; f.hit = .12;
    if (S.mode === 'play') S.hits++;
    if (f.hp > 0) {   // blindée / boss : coup partiel
      S.combo++; S.maxCombo = Math.max(S.maxCombo, S.combo); S.score += 5 * mult();
      Sfx.clang(); Hap.hit(); S.shake = Math.max(S.shake, f.type === 'boss' ? 7 : 3); S.freeze = .03;
      burst(f.x, f.y, f.type === 'boss' ? 10 : 6, '#fff', 200);
      text(f.x, f.y - f.r, f.type === 'boss' ? `${f.hp}` : '💥', '#fff', 26);
      if (f.type === 'boss') Sfx.boss();
      hud(true); return;
    }
    kill(f, chained);
  }
  const mult = () => Math.min(10, 1 + Math.floor(S.combo / 5));

  function kill(f, chained) {
    const sp = FLY[f.type];
    S.combo++; S.maxCombo = Math.max(S.maxCombo, S.combo);
    const m = mult(), pts = sp.pts * m;
    if (S.mode !== 'idle') S.score += pts;
    S.kills++; f.dead = true;
    S.splats.push({ x: f.x, y: f.y, c: sp.stain, r: f.r, t: 0 });   // tache qui « claque » avant de sécher dans le décor
    const big = f.type === 'boss' || f.type === 'golden' || f.type === 'bomb';
    burst(f.x, f.y, big ? 22 : 12, sp.stain, big ? 380 : 260);
    text(f.x, f.y - 6, S.mode === 'idle' ? 'SPLAT!' : `+${pts}`, f.type === 'golden' ? '#ffc933' : '#fff', 30 + Math.min(m, 10) * 2);
    Sfx.splat(S.combo);
    if (S.combo > 1) Sfx.combo(Math.min(S.combo, 15));
    S.shake = Math.max(S.shake, 4 + Math.min(S.combo, 20) * .25); S.freeze = chained ? 0 : .03 + Math.min(S.combo, 30) * .0016; S.zoom = Math.max(S.zoom, .35);
    if (S.combo >= 25) Hap.combo(); else Hap.hit();
    if (S.mode === 'tuto') { Sfx.milestone(); Hap.big(); S.shake = 14; S.freeze = .12; setTimeout(() => ev.onTutoDone && ev.onTutoDone(), 900); return; }
    if (S.mode === 'play') {
      if (f.type === 'golden') { S.golden++; S.timeLeft += 3; S.timeMax = Math.max(S.timeMax, S.timeLeft); text(f.x, f.y - 50, 'DORÉE ! +3s', '#ffc933', 34); Sfx.golden(); Hap.big(); S.ts = .35; S.tsT = .45; S.flash = .35; S.flashCol = '#ffe066'; }
      if (f.type === 'bomb') explode(f);
      if (f.type === 'boss') { S.timeLeft += 5; S.timeMax = Math.max(S.timeMax, S.timeLeft); text(W / 2, H * .4, 'MOUCHE-ZILLA K.O. !', '#ffc933', 38); Sfx.bossDie(); Hap.boom(); S.ts = .25; S.tsT = .7; S.shake = 22; S.flash = .5; S.flashCol = '#fff'; }
      if ([10, 25, 50, 100].includes(S.combo)) { text(W / 2, H * .32, `COMBO x${S.combo} !`, '#ffc933', 52); Sfx.milestone(); Hap.big(); S.zoom = 1; S.flash = .25; S.flashCol = '#fff'; }
    }
    hud(true);
  }
  function explode(f) {
    Sfx.boom(); Hap.boom(); S.shake = 16;
    S.swats.push({ x: f.x, y: f.y, t: 0, ring: true });
    S.flies.forEach(o => { if (o !== f && !o.dead && o.type !== 'boss' && Math.hypot(o.x - f.x, o.y - f.y) < 150) S.chain.push({ f: o, t: .08 + S.chain.length * .07 }); });
  }
  function beeHit(f) {
    f.dead = true; S.bees++; S.combo = 0; S.timeLeft -= 2; S.flash = .4; S.flashCol = '#ff3b3b'; S.shake = 10;
    S.splats.push({ x: f.x, y: f.y, c: '#ff4b3e', r: f.r, t: 0 }); burst(f.x, f.y, 10, '#ff4b3e', 260);
    text(f.x, f.y - 20, 'ABEILLE ! -2s', '#ff6b5e', 34); Sfx.bad(); Hap.bad(); hud(true);
  }

  // ---------- Effets ----------
  function burst(x, y, n, color, speed) {
    if (lowfx) n = Math.ceil(n / 2);
    for (let i = 0; i < n && S.parts.length < MAX_PARTS; i++) {
      const a = rnd(0, 6.28), s = rnd(.3, 1) * speed;
      S.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, life: rnd(.35, .7), max: .7, r: rnd(3, 7), c: Math.random() < .25 ? '#fff' : color, drop: !lowfx && Math.random() < .3 });
    }
  }
  function text(x, y, s, c, size) { if (S.texts.length < 24) S.texts.push({ x, y, s, c, size, t: 0 }); }
  function stainAt(x, y, color, r) {
    const g = stain.getContext('2d'); g.fillStyle = color; g.globalAlpha = .8;
    g.beginPath(); for (let i = 0; i < 7; i++) { const a = i / 7 * 6.28, rr = r * rnd(.7, 1.3); g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.fill();
    for (let i = 0; i < 6; i++) { const a = rnd(0, 6.28), d = rnd(r, r * 2.2); g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, rnd(2, 5), 0, 7); g.fill(); }
    g.globalAlpha = 1;
  }

  // ---------- Boucle ----------
  function targetAlive() {
    const lvl = Save.level();
    let n = 1 + Math.floor(S.elapsed / 9) + Math.floor(lvl / 5);
    if (S.event) n += 2;
    return clamp(n, 1, 3 + Math.floor(lvl / 4) + (S.event ? 2 : 0));
  }
  function update(dt) {
    S.t += dt;
    if (S.mode === 'play') {
      S.elapsed += dt; S.timeLeft -= dt;
      let alive = 0; for (const f of S.flies) if (!f.leaving || !f.out) alive++;
      S.spawnCd -= dt;
      if (S.spawnCd <= 0 && alive < targetAlive() + (S.boss ? 1 : 0)) { spawn(pickType(), false); S.spawnCd = rnd(.35, .8); }
      const lvl = Save.level();
      if (lvl >= 2 && S.waves < 2 && S.elapsed > 9 + S.waves * 10) { S.waves++; for (let i = 0; i < 4; i++) spawn(pickType() === 'bee' ? 'normal' : pickType(), false); text(W / 2, H * .3, 'VAGUE !', '#ff6b5e', 54); Hap.big(); Sfx.boss(); }
      if (lvl >= 6 && !S.boss && S.elapsed > 17) { S.boss = true; spawn('boss', false); text(W / 2, H * .3, '⚠ MOUCHE-ZILLA ⚠', '#ff3b3b', 40); Sfx.boss(); Hap.boom(); S.shake = 10; }
      const sec = Math.ceil(S.timeLeft);
      if (S.timeLeft <= 5 && sec !== S.lastTick && sec > 0) { S.lastTick = sec; Sfx.tick(); }
      if (S.timeLeft <= 0) { S.timeLeft = 0; endRound(); }
      hud(false);
    } else if (S.mode === 'idle') {
      S.idleCd -= dt;
      if (S.flies.length < 2 && S.idleCd <= 0) { spawn('normal', true); S.idleCd = .5; }
    }
    for (const f of S.flies) updateFly(f, dt);
    // fuites : combo cassé (sauf dorée/abeille : pas de pénalité)
    for (const f of S.flies) if (f.leaving && f.out && !f.dead) { f.dead = true; if (S.mode === 'play' && f.type !== 'bee' && f.type !== 'golden' && S.combo > 0) { if (S.combo >= 5) Sfx.comboBreak(); if (S.combo >= 3) text(clamp(f.x, 60, W - 60), clamp(f.y, 120, H - 60), 'ÉCHAPPÉE', '#ffb199', 24); S.combo = 0; hud(true); } }
    for (const c of S.chain) { c.t -= dt; if (c.t <= 0 && !c.f.dead) { c.f.hp = 0; kill(c.f, true); } }
    compact(S.chain, c => c.t > 0);
    compact(S.flies, f => !f.dead);
  }
  // Filtre sur place : évite de réallouer un tableau à chaque frame (GC = micro-saccades sur mobile)
  function compact(a, keep) { let j = 0; for (let i = 0; i < a.length; i++) if (keep(a[i])) a[j++] = a[i]; a.length = j; }
  function endRound() {
    S.mode = 'ending';
    if (!S.usedContinue && S.score > 0 && ev.onAskContinue) { ev.onAskContinue(); return; }
    finish();
  }
  function continueRound() { S.usedContinue = true; S.timeLeft = 10; S.timeMax = Math.max(S.timeMax, 10); S.mode = 'play'; S.lastTick = 99; }
  function finish() {
    S.mode = 'over'; Sfx.over();
    const acc = S.taps ? Math.round(S.hits / S.taps * 100) : 0;
    ev.onEnd && ev.onEnd({ kills: S.kills, score: S.score, maxCombo: S.maxCombo, acc, golden: S.golden, bees: S.bees, env: S.env.id });
  }
  function hud(pop) { ev.onHud && ev.onHud(false, pop); }

  function loop(now) {
    requestAnimationFrame(loop);
    let raw = Math.min(.05, (now - (loop.last || now)) / 1000); loop.last = now;
    if (S.tsT > 0) { S.tsT -= raw; if (S.tsT <= 0) S.ts = 1; }
    let dt = raw * S.ts;
    if (S.freeze > 0) { S.freeze -= raw; dt = 0; }
    if (S.mode !== 'ending') update(dt);
    for (const p of S.parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 600 * dt; p.vx *= .98; if (p.life <= 0 && p.drop) dropStain(p); }
    compact(S.parts, p => p.life > 0);
    for (const t of S.texts) { t.t += dt; t.y -= 45 * dt; }
    compact(S.texts, t => t.t < .9);
    for (const s of S.swats) s.t += raw;
    compact(S.swats, s => s.t < .26);
    for (const sp of S.splats) { sp.t += raw; if (sp.t >= .12) stainAt(sp.x, sp.y, sp.c, sp.r); }
    compact(S.splats, sp => sp.t < .12);
    adapt(raw);
    S.shake *= Math.pow(.003, raw); S.flash = Math.max(0, S.flash - raw); S.zoom = Math.max(0, S.zoom - raw * 4);
    draw();
  }

  function dropStain(p) { if (p.x < 0 || p.x > W || p.y < 0 || p.y > H) return; const g = stain.getContext('2d'); g.globalAlpha = .75; g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, p.r * .6, 0, 7); g.fill(); g.globalAlpha = 1; }
  // Qualité adaptative : si la moyenne glisse sous ~45 FPS, on allège les effets (jamais le gameplay)
  function adapt(raw) {
    ftAvg += (raw * 1000 - ftAvg) * .05;
    if (++ftN % 60) return;
    const slow = ftAvg > 22; if (slow !== lowfx) { lowfx = slow; MAX_PARTS = slow ? 90 : 220; }
  }

  // ---------- Rendu ----------
  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    const sx = (Math.random() - .5) * S.shake, sy = (Math.random() - .5) * S.shake, z = 1 + S.zoom * .03;
    ctx.translate(W / 2 + sx, H / 2 + sy); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
    ctx.drawImage(bg, 0, 0, W, H); ctx.drawImage(stain, 0, 0, W, H);
    for (const sp of S.splats) {   // overshoot : la tache gicle puis se stabilise
      const k = sp.t / .12, sc = k < .5 ? .5 + k * 1.6 : 1.3 - (k - .5) * .6; ctx.globalAlpha = .85; ctx.fillStyle = sp.c;
      ctx.beginPath(); ctx.ellipse(sp.x, sp.y, sp.r * 1.1 * sc, sp.r * .95 * sc, 0, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const f of S.flies) drawFly(f);
    if (S.env.hide && S.mode !== 'tuto') ctx.drawImage(curtain, 0, 0, W, H);
    for (const p of S.parts) { ctx.globalAlpha = Math.min(1, p.life * 3); ctx.fillStyle = p.c; ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2); }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    for (const t of S.texts) {
      const k = t.t / .9, sc = k < .15 ? .6 + k * 3 : 1;
      ctx.globalAlpha = 1 - Math.max(0, k - .6) / .4; ctx.font = `900 ${t.size * sc | 0}px ${fontFam}`;
      ctx.lineWidth = 6; ctx.strokeStyle = INK; ctx.strokeText(t.s, t.x, t.y); ctx.fillStyle = t.c; ctx.fillText(t.s, t.x, t.y);
    }
    ctx.globalAlpha = 1;
    const sk = SWATTERS.find(s => s.id === Save.d.sw) || SWATTERS[0];
    for (const s of S.swats) {
      if (s.ring) { const k = s.t / .26; ctx.strokeStyle = s.small ? 'rgba(255,255,255,.8)' : '#ffb347'; ctx.lineWidth = (s.small ? 4 : 10) * (1 - k); ctx.beginPath(); ctx.arc(s.x, s.y, s.small ? 8 + k * 40 : 20 + k * 130, 0, 7); ctx.stroke(); continue; }
      const k = s.t / .26, strike = Math.min(1, s.t / .045), rebound = s.t > .045 && s.t < .12 ? Math.sin((s.t - .045) / .075 * 3.14) * .08 : 0;
      drawSwatter(ctx, sk, s.x, s.y, 1 + (1 - strike) * .8 - rebound, -.6 * (1 - strike), k > .6 ? 1 - (k - .6) / .4 : 1, true);
    }
    ctx.restore();
    if (S.flash > 0) { ctx.globalAlpha = S.flash * .5; ctx.fillStyle = S.flashCol; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  }

  function drawFly(f) {
    const sp = FLY[f.type], s = f.r / 22, ang = Math.atan2(f.vy, f.vx);
    const c = ctx; c.save(); c.translate(f.x, f.y); c.globalAlpha = f.alpha;
    if (f.type === 'golden') { c.fillStyle = 'rgba(255,220,80,.35)'; c.beginPath(); c.arc(0, 0, f.r * 1.9 + Math.sin(f.age * 10) * 3, 0, 7); c.fill(); }
    if (f.type === 'fast') { c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 3; c.beginPath(); c.moveTo(-Math.cos(ang) * 30, -Math.sin(ang) * 30); c.lineTo(-Math.cos(ang) * 55, -Math.sin(ang) * 55); c.stroke(); }
    c.rotate(ang); c.scale(s * (1 + .3 * f.sq), s * (1 - .3 * f.sq));
    c.lineWidth = 2.6; c.strokeStyle = INK;
    const fl = Math.sin(f.age * 60) * .35;
    c.fillStyle = 'rgba(255,255,255,.6)';
    for (const sg of [-1, 1]) { c.save(); c.translate(-2, sg * 8); c.rotate(sg * (.7 + fl)); c.beginPath(); c.ellipse(-6, 0, 15, 7, 0, 0, 7); c.fill(); c.stroke(); c.restore(); }
    if (f.hit > 0) c.fillStyle = '#fff'; else c.fillStyle = sp.body;
    c.beginPath(); c.ellipse(-9, 0, 13, 9, 0, 0, 7); c.fill(); c.stroke();
    c.beginPath(); c.ellipse(4, 0, 9, 8, 0, 0, 7); c.fill(); c.stroke();
    if (f.type === 'bee') { c.strokeStyle = INK; c.lineWidth = 4; for (const x of [-14, -8, -2]) { c.beginPath(); c.moveTo(x, -8); c.lineTo(x, 8); c.stroke(); } c.lineWidth = 2.6; }
    if (f.type === 'bomb') { c.beginPath(); c.moveTo(-20, 0); c.lineTo(-28, -6); c.stroke(); c.fillStyle = Math.sin(f.fuse * 18) > 0 ? '#ffe14d' : '#ff6a2b'; c.beginPath(); c.arc(-29, -7, 4, 0, 7); c.fill(); }
    if (f.type === 'armored') { c.fillStyle = '#c9d2de'; c.beginPath(); c.arc(14, 0, 9.5, -1.9, 1.9); c.fill(); c.stroke(); }
    c.fillStyle = f.hit > 0 ? '#fff' : sp.body; c.beginPath(); c.arc(14, 0, 7, 0, 7); c.fill(); c.stroke();
    c.fillStyle = sp.eye; for (const sg of [-1, 1]) { c.beginPath(); c.arc(17, sg * 4.2, 3.6, 0, 7); c.fill(); c.stroke(); }
    if (f.type === 'boss') { c.fillStyle = '#ffc933'; c.beginPath(); c.moveTo(8, -9); c.lineTo(10, -17); c.lineTo(14, -10); c.lineTo(18, -17); c.lineTo(20, -8); c.closePath(); c.fill(); c.stroke(); }
    c.restore();
    if (f.maxHp > 1 && f.hp > 0) {   // pastilles de vie
      c.save(); c.translate(f.x, f.y + f.r + 10);
      if (f.type === 'boss') { c.fillStyle = INK; c.fillRect(-45, 0, 90, 12); c.fillStyle = '#ff3b3b'; c.fillRect(-43, 2, 86 * f.hp / f.maxHp, 8); }
      else for (let i = 0; i < f.hp; i++) { c.fillStyle = '#ff3b3b'; c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); c.arc((i - (f.hp - 1) / 2) * 12, 0, 4.5, 0, 7); c.fill(); c.stroke(); }
      c.restore();
    }
  }

  // Tapette : le point de frappe est le centre de la tête. Dessin partagé avec la boutique.
  function drawSwatter(c, sk, x, y, sc, rot, al, live) {
    c.save(); c.translate(x, y); c.rotate(rot - .55); c.scale(sc * sk.size, sc * sk.size); c.globalAlpha = al;
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.strokeStyle = INK; c.lineWidth = 17; c.beginPath(); c.moveTo(0, 28); c.lineTo(0, 120); c.stroke();
    c.strokeStyle = sk.handle; c.lineWidth = 9; c.beginPath(); c.moveTo(0, 28); c.lineTo(0, 120); c.stroke();
    if (sk.neon) { c.shadowColor = sk.neon; c.shadowBlur = live ? 0 : 10; }
    c.fillStyle = sk.head; c.strokeStyle = sk.neon || INK; c.lineWidth = 5;
    c.beginPath();
    if (sk.mace) { c.arc(0, -4, 36, 0, 7); } else { c.roundRect(-32, -42, 64, 74, 18); }
    c.fill(); c.stroke(); c.shadowBlur = 0;
    if (sk.mace) { c.fillStyle = INK; for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; c.beginPath(); c.moveTo(Math.cos(a - .2) * 34, -4 + Math.sin(a - .2) * 34); c.lineTo(Math.cos(a) * 50, -4 + Math.sin(a) * 50); c.lineTo(Math.cos(a + .2) * 34, -4 + Math.sin(a + .2) * 34); c.fill(); } }
    c.fillStyle = 'rgba(0,0,0,.28)';
    for (let i = -2; i <= 2; i++) for (let j = -3; j <= 2; j++) { if (sk.mace && Math.hypot(i * 11, j * 11 + 4) > 28) continue; c.beginPath(); c.arc(i * 11, j * 11 - 5, 3.2, 0, 7); c.fill(); }
    if (sk.shine) { c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.roundRect(-26, -36, 10, 40, 5); c.fill(); }
    if (sk.spark && live) { c.strokeStyle = sk.fx; c.lineWidth = 3; for (let i = 0; i < 3; i++) { const a = rnd(0, 6.28); c.beginPath(); c.moveTo(Math.cos(a) * 30, Math.sin(a) * 30); for (let k = 1; k < 4; k++) c.lineTo(Math.cos(a) * (30 + k * 9) + rnd(-7, 7), Math.sin(a) * (30 + k * 9) + rnd(-7, 7)); c.stroke(); } }
    c.restore();
  }

  function init() {
    fontFam = getComputedStyle(document.body).fontFamily;
    window.addEventListener('resize', resize); resize();
    cv.addEventListener('pointerdown', e => { e.preventDefault(); const r = cv.getBoundingClientRect(); onTap(e.clientX - r.left, e.clientY - r.top); });
    requestAnimationFrame(loop);
  }
  return { S, ev, init, idle, startRound, startTuto, setEnv, continueRound, finish, drawSwatter, buildEnv, resize, onTap,
    setEvent: e => { S.event = e; } };
})();
