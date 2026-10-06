'use strict';
// UI : écrans, progression, missions, boutique, flux publicitaires.
const UI = (() => {
  const $ = id => document.getElementById(id);
  const D = Save.d, S = Game.S;
  let lastRes = null, lastCoinsGain = 0;

  const show = id => $(id).classList.remove('hidden'), hide = id => $(id).classList.add('hidden');
  function toast(msg, ms = 2200) { const t = $('toast'); t.textContent = msg; t.classList.remove('hidden'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.add('hidden'), ms); }
  const day = () => Save.today();
  const dayNum = () => Math.floor(Date.now() / 864e5);

  // ---- Événement : week-end = INVASION (×1,5 pièces, +2 mouches). ?event=1 force en dev ----
  function currentEvent() {
    const g = new Date().getDay(), forced = CFG.dev && /[?&]event/.test(location.search);
    return (g === 0 || g === 6 || forced) ? { id: 'invasion', name: '🪰 INVASION DE MOUCHES — pièces ×1,5' } : null;
  }

  // ---- Missions du jour (déterministes par date) ----
  function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function ensureMissions() {
    if (D.mis && D.mis.day === day()) return;
    const r = rng(dayNum()), lvl = Save.level();
    const pool = MISSIONS.filter(m => (m.minLvl || 1) <= lvl).sort(() => r() - .5).slice(0, 3);
    const tier = lvl < 4 ? 0 : lvl < 9 ? 1 : 2;
    D.mis = { day: day(), list: pool.map(m => ({ id: m.id, goal: m.vals[Math.min(tier, 2)], prog: 0, done: false })), bonus: false };
    Save.save();
  }
  function dailyLogin() {
    if (D.lastDay === day()) return;
    const yest = new Date(Date.now() - 864e5), y = `${yest.getFullYear()}-${yest.getMonth() + 1}-${yest.getDate()}`;
    D.streak = D.lastDay === y ? D.streak + 1 : 1; D.lastDay = day();
    const gift = 15 * Math.min(D.streak, 7); D.coins += gift; Save.save();
    toast(`Jour ${D.streak} d'affilée ! +${gift} 🪙`, 3000);
  }
  function applyMissions(res) {
    const done = [];
    D.mis.list.forEach(m => {
      if (m.done) return; const def = MISSIONS.find(x => x.id === m.id);
      m.prog = def.up(m.prog, res);
      if (m.prog >= m.goal) { m.prog = m.goal; m.done = true; D.coins += MISSION_REWARD; lastCoinsGain += MISSION_REWARD; done.push(def.txt(m.goal)); }
    });
    if (!D.mis.bonus && D.mis.list.every(m => m.done)) { D.mis.bonus = true; D.coins += MISSION_ALL_BONUS; lastCoinsGain += MISSION_ALL_BONUS; done.push('Tous les défis ! bonus'); }
    return done;
  }

  // ---- Accueil ----
  function renderHome() {
    const i = Save.info();
    $('coins').textContent = D.coins; $('lvlN').textContent = i.level; $('xpFill').style.width = (i.cur / i.need * 100) + '%';
    $('bestScore').textContent = D.best;
    const sk = SWATTERS.find(s => s.id === D.sw); $('swName').textContent = sk.name;
    const pc = $('swPrev').getContext('2d'); pc.clearRect(0, 0, 64, 64); Game.drawSwatter(pc, sk, 22, 22, .42, 0, 1, false);
    const env = ENVS[D.env]; $('envName').textContent = env.label;
    ensureMissions(); const m = D.mis.list[0], def = MISSIONS.find(x => x.id === m.id);
    $('dailyTxt').textContent = `🎯 ${def.txt(m.goal)} — ${m.prog}/${m.goal}`;
    $('dailyFill').style.width = (m.prog / m.goal * 100) + '%'; $('btnDaily').classList.toggle('done', m.done);
    const e = currentEvent(); $('eventBanner').classList.toggle('hidden', !e); if (e) $('eventBanner').textContent = e.name;
    Game.setEvent(e);
  }
  function goHome() {
    hide('over'); hide('hud'); hide('tuto'); show('home'); Game.setEnv(D.env); Game.idle(); renderHome();
  }

  // ---- Partie ----
  async function play() {
    Sfx.unlock(); Sfx.ui(); hide('home'); hide('over');
    if (!D.tuto) { show('tuto'); $('tutoTxt').textContent = 'Écrase-la.'; Game.startTuto(); return; }
    show('hud'); Game.startRound(); Analytics.log('round');
  }
  Game.ev.onTutoDone = () => { D.tuto = true; Save.save(); hide('tuto'); show('hud'); Game.setEnv(D.env); Game.startRound(); };
  // HUD : on n'écrit dans le DOM que si la valeur change (appelé à chaque frame)
  const H = { score: -1, time: -1, pct: -1, cls: null, combo: -1, mult: 0, heat: -1 };
  Game.ev.onHud = (starting, pop) => {
    if (starting === true) { show('hud'); }
    if (H.score !== S.score) { H.score = S.score; $('hScore').textContent = S.score; }
    if (pop) { $('hScore').classList.add('pop'); setTimeout(() => $('hScore').classList.remove('pop'), 80); }
    const pct = Math.round(Math.max(0, Math.min(1, S.timeLeft / S.timeMax)) * 100);
    if (H.pct !== pct) { H.pct = pct; $('hFill').style.width = pct + '%'; }
    const cls = S.timeLeft <= 5 ? 'crit' : S.timeLeft <= 10 ? 'warn' : '';
    if (H.cls !== cls) { H.cls = cls; $('hFill').className = cls; }
    const t = Math.ceil(S.timeLeft); if (H.time !== t) { H.time = t; $('hTime').textContent = t; }
    if (H.combo !== S.combo) {
      H.combo = S.combo; const hc = $('hCombo'); hc.classList.toggle('hidden', S.combo < 2);
      if (S.combo >= 2) {
        const mt = Math.min(10, 1 + Math.floor(S.combo / 5));
        $('hComboN').textContent = S.combo + ' combo';
        if (H.mult !== mt) { H.mult = mt; $('hMult').textContent = 'x' + mt; hc.classList.remove('pop'); void hc.offsetWidth; hc.classList.add('pop'); }
      } else H.mult = 0;
      // Chaleur du combo : le bord de l'écran s'embrase de plus en plus
      const heat = S.combo >= 50 ? 3 : S.combo >= 25 ? 2 : S.combo >= 10 ? 1 : 0;
      if (H.heat !== heat) { H.heat = heat; $('vignette').style.boxShadow = heat ? `inset 0 0 ${60 + heat * 40}px ${heat * 6}px rgba(255,${150 - heat * 40},40,${.25 + heat * .15})` : 'none'; }
    }
  };
  Game.ev.onAskContinue = () => {
    if (S.timeMax > 0 && !D.noAds || true) { show('cont'); }
  };
  $('cYes').onclick = async () => { hide('cont'); const ok = await Ads.rewarded('continue'); if (ok) Game.continueRound(); else Game.finish(); };
  $('cNo').onclick = () => { hide('cont'); Game.finish(); };

  Game.ev.onEnd = res => {
    lastRes = res; lastCoinsGain = 0; Ads.roundPlayed();
    const ev = currentEvent();
    let coins = Math.floor(res.score / 20) + res.golden * 5; if (ev) coins = Math.round(coins * 1.5);
    const xp = res.kills + Math.floor(res.score / 100);
    const before = Save.level();
    res.newBest = res.score > D.best; if (res.newBest) D.best = res.score;
    if (res.maxCombo > D.bestCombo) D.bestCombo = res.maxCombo;
    D.kills += res.kills; D.rounds++; D.xp += xp; D.coins += coins; lastCoinsGain += coins;
    const mis = applyMissions(res); res.coins = coins; res.levelUp = Save.level() > before ? Save.level() : 0;
    Save.save(); Analytics.log('round_end', { kills: res.kills, score: res.score, combo: res.maxCombo });
    hide('hud'); show('over');
    $('ovKills').textContent = res.kills; $('ovScore').textContent = res.score; $('ovCombo').textContent = 'x' + res.maxCombo; $('ovAcc').textContent = res.acc + '%';
    $('ovRecord').classList.toggle('hidden', !res.newBest);
    $('ovLvl').classList.toggle('hidden', !res.levelUp); if (res.levelUp) $('ovLvl').textContent = '⬆ NIVEAU ' + res.levelUp + (unlockTxt(res.levelUp));
    $('ovMis').innerHTML = mis.map(t => `✅ ${t} (+${MISSION_REWARD} 🪙)`).join('<br>');
    countUp($('ovCoins'), lastCoinsGain);
    $('btnDouble').classList.remove('hidden'); $('btnDouble').disabled = false;
    $('coins').textContent = D.coins;
  };
  function unlockTxt(l) {
    const u = { 2: ' · mouches rapides & dorées', 3: ' · blindées & abeilles', 4: ' · fantômes & salle de bain', 5: ' · mouches explosives', 6: ' · BOSS', 8: ' · jardin' }[l];
    return u || '';
  }
  function countUp(el, n) { let k = 0; const iv = setInterval(() => { k += Math.max(1, Math.ceil(n / 20)); if (k >= n) { k = n; clearInterval(iv); } el.textContent = k; }, 30); }

  $('btnAgain').onclick = async () => { Sfx.unlock(); hide('over'); show('hud'); Game.setEnv(D.env); Game.startRound(); };
  $('btnHome').onclick = async () => { Sfx.ui(); await Ads.interstitial(); goHome(); };
  $('btnDouble').onclick = async () => {
    const ok = await Ads.rewarded('double'); if (!ok) return;
    D.coins += lastCoinsGain; Save.save(); $('ovCoins').textContent = lastCoinsGain * 2; $('btnDouble').classList.add('hidden'); $('coins').textContent = D.coins; Sfx.buy(); toast('Récompense doublée !');
  };
  $('btnShare').onclick = shareCard;

  async function shareCard() {
    const r = lastRes; if (!r) return;
    const c = document.createElement('canvas'); c.width = 1080; c.height = 1350; const g = c.getContext('2d');
    g.fillStyle = '#1b1020'; g.fillRect(0, 0, 1080, 1350);
    g.fillStyle = '#ffc933'; g.fillRect(0, 0, 1080, 18);
    g.textAlign = 'center'; g.font = '900 120px "Arial Rounded MT Bold",system-ui,sans-serif';
    g.fillStyle = '#ffc933'; g.fillText('BUZZ', 540, 190); g.fillStyle = '#7bd33f'; g.fillText('KILL', 540, 310);
    g.fillStyle = '#fff'; g.font = '900 360px system-ui,sans-serif'; g.fillText(r.kills, 540, 700);
    g.font = '900 70px system-ui,sans-serif'; g.fillText(`MOUCHES EN ${CFG.roundTime} SECONDES`, 540, 800);
    g.fillStyle = '#ffc933'; g.font = '900 90px system-ui,sans-serif'; g.fillText(`COMBO x${r.maxCombo}`, 540, 960);
    g.fillStyle = '#fff'; g.font = '900 56px system-ui,sans-serif'; g.fillText(`${r.score} pts · ${r.acc}% précision`, 540, 1060);
    g.font = '60px serif'; g.fillText('🪰', 540, 1200); g.font = '900 40px system-ui,sans-serif'; g.fillStyle = '#aaa'; g.fillText('Fais mieux. Si tu peux.', 540, 1290);
    const blob = await new Promise(r => c.toBlob(r, 'image/png')); const file = new File([blob], 'buzzkill.png', { type: 'image/png' });
    Analytics.log('share');
    try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text: `${r.kills} mouches écrasées, combo x${r.maxCombo} sur BUZZ KILL !` }); return; } } catch (e) { return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'buzzkill.png'; a.click();
  }

  // ---- Modales ----
  function openModal(id) { Sfx.ui(); show(id); }
  document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => { Sfx.ui(); b.closest('.modal').classList.add('hidden'); renderHome(); });
  $('btnSwatter').onclick = () => { renderShop(); openModal('shop'); };
  $('btnDaily').onclick = () => { renderMissions(); openModal('missions'); };
  $('btnSettings').onclick = () => { renderSettings(); openModal('settings'); };
  $('btnEnv').onclick = () => {
    const ids = Object.keys(ENVS), lvl = Save.level();
    let i = ids.indexOf(D.env);
    for (let k = 1; k <= ids.length; k++) {
      const e = ENVS[ids[(i + k) % ids.length]];
      if (e.minLvl <= lvl) { D.env = e.id; break; }
    }
    const locked = ids.map(x => ENVS[x]).find(e => e.minLvl > lvl);
    Save.save(); Game.setEnv(D.env); Sfx.ui(); renderHome();
    toast(ENVS[D.env].rule + (locked ? `  🔒 ${locked.label} au niveau ${locked.minLvl}` : ''), 3000);
  };

  function renderShop() {
    const g = $('shopGrid'); g.innerHTML = '';
    SWATTERS.forEach(sk => {
      const owned = D.owned.includes(sk.id), b = document.createElement('button');
      b.className = 'sw' + (D.sw === sk.id ? ' sel' : '') + (owned ? '' : ' lock');
      b.innerHTML = `<canvas width="144" height="144"></canvas><div>${sk.name}</div><div>${D.sw === sk.id ? 'ÉQUIPÉE' : owned ? 'ÉQUIPER' : sk.price + ' 🪙'}</div>`;
      Game.drawSwatter(b.querySelector('canvas').getContext('2d'), sk, 50, 50, .85, 0, 1, false);
      b.onclick = () => {
        if (!owned) { if (D.coins < sk.price) { toast('Pas assez de pièces. Joue encore ! 🪰'); return; } D.coins -= sk.price; D.owned.push(sk.id); Sfx.buy(); }
        D.sw = sk.id; Save.save(); renderShop();
      };
      g.appendChild(b);
    });
  }
  function renderMissions() {
    ensureMissions();
    $('misList').innerHTML = D.mis.list.map(m => { const d = MISSIONS.find(x => x.id === m.id);
      return `<div class="mis ${m.done ? 'done' : ''}">${m.done ? '✅' : '🎯'} ${d.txt(m.goal)} <small>(+${MISSION_REWARD} 🪙)</small><div class="xp"><i style="width:${m.prog / m.goal * 100}%"></i></div></div>`; }).join('');
    $('streakTxt').textContent = `Série : ${D.streak} jour${D.streak > 1 ? 's' : ''}. Les 3 défis = +${MISSION_ALL_BONUS} 🪙 bonus.`;
  }
  function renderSettings() {
    $('tgSound').textContent = D.sound ? '🔊 Sons : OUI' : '🔇 Sons : NON';
    $('tgHaptics').textContent = D.haptics ? '📳 Vibrations : OUI' : '📴 Vibrations : NON';
    $('noAdsPrice').textContent = D.noAds ? 'actif ✅' : CFG.removeAdsPrice;
  }
  $('tgSound').onclick = () => { D.sound = !D.sound; Save.save(); renderSettings(); Sfx.ui(); };
  $('tgHaptics').onclick = () => { D.haptics = !D.haptics; Save.save(); renderSettings(); Hap.big(); };
  $('btnConsent').onclick = () => { hide('settings'); show('consent'); };
  $('btnNoAds').onclick = () => {
    // Placeholder : brancher l'achat in-app (StoreKit / Play Billing) ici.
    if (D.noAds) return; if (CFG.dev) { D.noAds = true; Save.save(); renderSettings(); toast('Pubs retirées (mode dev)'); Analytics.log('remove_ads'); }
    else toast('Achat in-app à brancher au build natif.');
  };
  $('cAccept').onclick = () => { D.consent = 'p'; Save.save(); hide('consent'); };
  $('cRefuse').onclick = () => { D.consent = 'np'; Save.save(); hide('consent'); };

  $('btnPlay').onclick = play;

  function boot() {
    Game.init(); dailyLogin(); goHome();
    if (D.consent == null && D.tuto) show('consent');
    // Le consentement est demandé après le 1er contact avec le jeu (jamais avant le fun).
    const orig = Game.ev.onTutoDone;
    Game.ev.onTutoDone = () => { orig(); };
    if (navigator.serviceWorker && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  // Après la 1re partie, demander le consentement avant toute pub
  const _end = Game.ev.onEnd;
  Game.ev.onEnd = res => { _end(res); if (D.consent == null) setTimeout(() => show('consent'), 900); };
  boot();
  return { goHome, play, toast };
})();
