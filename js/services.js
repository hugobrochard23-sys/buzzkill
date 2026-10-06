'use strict';

// ---- Analytics : anonyme, local, désactivé par défaut (CFG.analytics) ----
// Aucun identifiant, aucun envoi réseau ici. Pour brancher un backend, remplacer flush().
const Analytics = (() => {
  const Q = [];
  function log(name, props = {}) {
    if (!CFG.analytics) return;
    Q.push({ name, props, t: Date.now() });
    if (Q.length > 200) Q.shift();
    try { localStorage.setItem('bk.events', JSON.stringify(Q)); } catch (e) {}
  }
  return { log };
})();

// ---- Publicité : interface unique. Remplacer le « provider » par AdMob (Capacitor) en prod ----
// Règles : rewarded = prioritaire et toujours volontaire ; interstitiel = rare, jamais en partie.
const Ads = (() => {
  let lastInter = 0, roundsSince = 0, shownOnce = false;
  const personalised = () => Save.d.consent === 'p';   // à passer au SDK (npa=1 si faux)

  // --- provider factice (placeholder identifié) ---
  function mock(label, seconds, skippable) {
    return new Promise(res => {
      const ov = document.getElementById('adov'), cnt = document.getElementById('adCount'), btn = document.getElementById('adClose');
      let s = seconds; cnt.textContent = s; btn.disabled = true; btn.textContent = 'Patiente…'; ov.classList.remove('hidden');
      const iv = setInterval(() => {
        s--; cnt.textContent = Math.max(s, 0);
        if (s <= 0) { clearInterval(iv); btn.disabled = false; btn.textContent = 'Fermer'; }
      }, 1000);
      btn.onclick = () => { clearInterval(iv); ov.classList.add('hidden'); res(s <= 0); };
    });
  }

  return {
    personalised,
    roundPlayed() { roundsSince++; },
    // Interstitiel : seulement sur un changement naturel de session (retour accueil)
    canInterstitial() {
      const c = CFG.ads;
      if (Save.d.noAds || Save.d.consent == null) return false;
      if (Save.d.rounds < c.minRoundsBeforeFirst) return false;
      if (roundsSince < c.interstitialEveryRounds) return false;
      return Date.now() - lastInter > c.cooldownMs;
    },
    async interstitial() {
      if (!this.canInterstitial()) return;
      lastInter = Date.now(); roundsSince = 0;
      Analytics.log('ad_interstitial');
      await mock('inter', 3, false);
    },
    // Rewarded : resolve(true) uniquement si la pub est vue jusqu'au bout.
    async rewarded(placement) {
      Analytics.log('ad_rewarded', { placement });
      const ok = await mock('rewarded', 3, false);
      if (ok) Analytics.log('ad_rewarded_done', { placement });
      return ok;
    },
  };
})();
