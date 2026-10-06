'use strict';
// Sons 100 % synthétisés (WebAudio) : zéro asset, zéro chargement, ~0 Ko.
const Sfx = (() => {
  let ac, master, nbuf;
  function init() {
    if (ac) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    master = ac.createGain(); master.gain.value = 0.8; master.connect(ac.destination);
    nbuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const ch = nbuf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
  }
  function unlock() { init(); if (ac && ac.state === 'suspended') ac.resume(); }
  const ok = () => ac && Save.d.sound;

  function tone(f, dur, type = 'sine', vol = 0.3, slide = 0, delay = 0) {
    if (!ok()) return;
    const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f + slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, freq, vol = 0.3, type = 'lowpass', delay = 0) {
    if (!ok()) return;
    const t = ac.currentTime + delay, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = nbuf; f.type = type; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }
  const PENTA = [0, 2, 4, 7, 9];
  const note = (step) => 261.6 * Math.pow(2, (PENTA[step % 5] + 12 * Math.floor(step / 5)) / 12);

  return {
    unlock,
    // TAP : claque de la tapette (toujours, touche ou pas)
    tap()   { noise(0.07, 2200, 0.35); tone(150, 0.08, 'sine', 0.4, -90); },
    // SPLAT : écrasement. La hauteur monte avec le combo (satisfaction cumulative).
    splat(c = 0) { const k = Math.min(c, 24); noise(0.14, 700 + k * 40, 0.5, 'bandpass'); tone(220 + k * 9, 0.13, 'triangle', 0.35, -150); tone(90, 0.12, 'sine', 0.5, -50); },
    clang() { tone(900, 0.12, 'square', 0.18, -300); noise(0.05, 5000, 0.2, 'highpass'); },
    miss()  { tone(190, 0.16, 'sawtooth', 0.14, -90); },
    comboBreak() { tone(440, .25, 'triangle', .22, -300); tone(330, .3, 'sine', .15, -200, .08); },
    bad()   { tone(110, 0.3, 'sawtooth', 0.3, -50); tone(116, 0.3, 'square', 0.15, -50); },
    combo(step) { tone(note(step), 0.16, 'triangle', 0.3); tone(note(step) * 2, 0.2, 'sine', 0.15, 0, 0.04); },
    milestone() { [0, 2, 4, 7].forEach((n, i) => tone(note(n + 5), 0.22, 'square', 0.14, 0, i * 0.06)); },
    golden() { [9, 11, 12, 14, 16].forEach((n, i) => tone(note(n), 0.25, 'sine', 0.25, 0, i * 0.055)); },
    boom()  { noise(0.4, 400, 0.7); tone(70, 0.4, 'sine', 0.7, -40); },
    boss()  { tone(55, 0.5, 'sawtooth', 0.3, 20); tone(58, 0.5, 'square', 0.15, 20); },
    bossDie() { noise(0.7, 500, 0.7); tone(120, 0.7, 'sawtooth', 0.4, -90); [0, 4, 7, 9, 12].forEach((n, i) => tone(note(n + 5), 0.3, 'triangle', 0.25, 0, 0.3 + i * 0.08)); },
    tick()  { tone(1100, 0.04, 'square', 0.08); },
    over()  { [12, 9, 7, 4, 0].forEach((n, i) => tone(note(n), 0.28, 'triangle', 0.25, 0, i * 0.12)); },
    buy()   { tone(660, 0.1, 'square', 0.2); tone(990, 0.16, 'square', 0.2, 0, 0.09); },
    ui()    { tone(520, 0.05, 'square', 0.12); },
  };
})();

// Haptics. navigator.vibrate = Android/Chrome. iOS Safari l'ignore :
// en build natif (Capacitor), brancher @capacitor/haptics ici, et seulement ici.
const Hap = (() => {
  let last = 0;
  function v(p) {
    if (!Save.d.haptics || !navigator.vibrate) return;
    const n = performance.now(); if (n - last < 25) return; last = n;   // pas de spam batterie
    try { navigator.vibrate(p); } catch (e) {}
  }
  return {
    tap: () => v(8), hit: () => v(16), combo: () => v([22, 25, 22]), big: () => v([45, 30, 70]),
    boom: () => v([80, 30, 120]), bad: () => v(70), miss: () => v(6),
  };
})();
