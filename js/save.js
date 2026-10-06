'use strict';
// Sauvegarde locale (aucun compte, aucune donnée envoyée).
const Save = (() => {
  const KEY = 'buzzkill.v1';
  const def = () => ({
    coins: 0, xp: 0, best: 0, bestCombo: 0, kills: 0, rounds: 0,
    sw: 'classic', owned: ['classic'], env: 'kitchen',
    tuto: false, consent: null, noAds: false, sound: true, haptics: true,
    streak: 0, lastDay: '', mis: null,
  });
  const d = def();
  try { Object.assign(d, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} };

  const need = l => 50 + 30 * l;            // XP requis pour passer du niveau l à l+1
  function level() { return info().level; }
  function info() {
    let x = d.xp, l = 1;
    while (x >= need(l)) { x -= need(l); l++; }
    return { level: l, cur: x, need: need(l) };
  }
  function setLevel(n) { let t = 0; for (let l = 1; l < n; l++) t += need(l); d.xp = t; }
  const today = () => { const t = new Date(); return `${t.getFullYear()}-${t.getMonth() + 1}-${t.getDate()}`; };

  // Dev uniquement : ?lvl=8&coins=2000&reset
  if (CFG.dev) {
    const q = new URLSearchParams(location.search);
    if (q.has('reset')) Object.assign(d, def());
    if (q.has('lvl')) setLevel(+q.get('lvl'));
    if (q.has('coins')) d.coins = +q.get('coins');
    if (q.has('skiptuto')) { d.tuto = true; d.consent = d.consent || 'np'; }
  }
  return { d, save, level, info, setLevel, today, need };
})();
