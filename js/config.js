'use strict';
// Constantes de design : tout l'équilibrage est ici.
const INK = '#1b1020';

const CFG = {
  name: 'BUZZ KILL',
  roundTime: 30,
  missPenalty: 0.75,          // secondes perdues sur un tap dans le vide
  hitSlop: 16,                // marge de tolérance du doigt (px) : jamais de « raté » injuste
  analytics: false,           // anonyme, local, désactivé par défaut (voir services.js)
  removeAdsPrice: '3,99 €',
  ads: { interstitialEveryRounds: 4, minRoundsBeforeFirst: 3, cooldownMs: 180000 },
  dev: /^(localhost|127\.0\.0\.1)$/.test(location.hostname),
};

// Types de mouches. minLvl = niveau joueur requis pour apparaître.
const FLY = {
  normal:  { pts: 10,  hp: 1,  speed: 95,  r: 24, life: 5.5, minLvl: 1, body: '#2e2a38', eye: '#ff3b3b', stain: '#7bd33f', name: '' },
  fast:    { pts: 25,  hp: 1,  speed: 230, r: 21, life: 3.6, minLvl: 2, body: '#ff7a1a', eye: '#fff',    stain: '#ff9a3c', name: 'RAPIDE' },
  golden:  { pts: 150, hp: 1,  speed: 250, r: 24, life: 3.4, minLvl: 2, body: '#ffc933', eye: '#fff',    stain: '#ffd84a', name: 'DORÉE !' },
  armored: { pts: 45,  hp: 3,  speed: 85,  r: 30, life: 7.5, minLvl: 3, body: '#8d98a8', eye: '#ff3b3b', stain: '#9fb0c8', name: 'BLINDÉE' },
  bee:     { pts: 0,   hp: 1,  speed: 110, r: 26, life: 6.5, minLvl: 3, body: '#ffd21f', eye: '#222',    stain: '#ff4b3e', name: 'ABEILLE !' },
  ghost:   { pts: 40,  hp: 1,  speed: 105, r: 24, life: 5.5, minLvl: 4, body: '#cfe8ff', eye: '#6c3cf0', stain: '#bfe3ff', name: 'FANTÔME' },
  bomb:    { pts: 35,  hp: 1,  speed: 100, r: 26, life: 5.5, minLvl: 5, body: '#c4302b', eye: '#fff',    stain: '#ff6a2b', name: 'BOUM !' },
  boss:    { pts: 500, hp: 12, speed: 55,  r: 74, life: 999, minLvl: 6, body: '#3b2b55', eye: '#ffc933', stain: '#8bdc4a', name: 'MOUCHE-ZILLA' },
};

// Environnements : chacun change le gameplay, pas seulement le décor.
const ENVS = {
  kitchen:  { id: 'kitchen',  label: '🍳 Cuisine',   minLvl: 1, speed: 1.0,  rule: 'Les mouches tournent autour de la nourriture.',
              spots: [[.26, .66], [.72, .60], [.5, .84]] },
  bathroom: { id: 'bathroom', label: '🚿 Salle de bain', minLvl: 4, speed: 1.0, rule: 'Elles se cachent derrière le rideau de douche.', hide: true },
  garden:   { id: 'garden',   label: '🌻 Jardin',    minLvl: 8, speed: 1.3,  rule: 'Plus rapide. Attention aux abeilles.',
              spots: [[.2, .75], [.78, .7]] },
};

// Tapettes : 100 % cosmétiques (mêmes dégâts, même hitbox).
const SWATTERS = [
  { id: 'classic',  name: 'Classique',  price: 0,    head: '#e8453c', handle: '#2d2a33', fx: '#ff8a6b', size: 1 },
  { id: 'foam',     name: 'Mousse',     price: 120,  head: '#ff8ccf', handle: '#ffe14d', fx: '#ffc2e8', size: 1.2 },
  { id: 'electric', name: 'Électrique', price: 300,  head: '#2fd5ff', handle: '#1b1020', fx: '#baf4ff', size: 1, spark: true },
  { id: 'medieval', name: 'Médiévale',  price: 500,  head: '#9aa0aa', handle: '#6b4423', fx: '#d9dde3', size: 1, mace: true },
  { id: 'laser',    name: 'Laser',      price: 800,  head: '#1b1020', handle: '#2a2a3a', fx: '#39ff88', size: 1, neon: '#39ff88' },
  { id: 'gold',     name: 'Dorée',      price: 1500, head: '#ffc933', handle: '#b8741a', fx: '#fff1a8', size: 1.1, shine: true },
];

// Missions du jour (tirées d'un tirage déterministe par date).
const MISSIONS = [
  { id: 'kills',  vals: [60, 100, 150], txt: n => `Écrase ${n} mouches`,              up: (p, r) => p + r.kills },
  { id: 'combo',  vals: [15, 25, 40],   txt: n => `Fais un combo de ${n}`,            up: (p, r) => Math.max(p, r.maxCombo) },
  { id: 'score',  vals: [800, 1500, 2500], txt: n => `Atteins ${n} points en une partie`, up: (p, r) => Math.max(p, r.score) },
  { id: 'rounds', vals: [3, 5, 8],      txt: n => `Joue ${n} parties`,                up: (p) => p + 1 },
  { id: 'golden', vals: [1, 2, 3],      txt: n => `Écrase ${n} mouche${n > 1 ? 's' : ''} dorée${n > 1 ? 's' : ''}`, up: (p, r) => p + r.golden, minLvl: 2 },
  { id: 'clean',  vals: [20, 30, 40],   txt: n => `${n}+ mouches sans toucher d'abeille`, up: (p, r) => (r.bees === 0 && r.kills >= n ? n : p), minLvl: 3 },
];
const MISSION_REWARD = 40, MISSION_ALL_BONUS = 60;
