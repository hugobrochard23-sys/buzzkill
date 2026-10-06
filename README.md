# BUZZ KILL

Arcade mobile : 30 secondes, un doigt, un combo à ne pas casser. HTML5 canvas, zéro dépendance, offline (PWA).

**Lancer** : `python3 -m http.server 8765` dans ce dossier → http://localhost:8765 (vue mobile).
**Debug (localhost seulement)** : `?reset` `?lvl=8` `?coins=2000` `?skiptuto` `?event` (force l'invasion).

## Design
- **Boucle** : manche de 30 s → écraser → combo (x1→x10, +1 palier / 5) → pièces + XP → déblocage → REJOUER.
- **Tension** : taper dans le vide = -0,75 s + combo à zéro ; mouche qui s'échappe = combo à zéro ; abeille = -2 s. Mouche dorée +3 s, boss +5 s. On est puni de l'imprécision, pas du hasard (marge de tolérance de 16 px).
- **Maison infestée** : chaque écrasement tache le décor pendant la manche. Gratuit, drôle, très lisible.
- **Mouches** (déblocage par niveau) : normale · rapide (2) · dorée (2) · blindée (3) · abeille à ne PAS taper (3) · fantôme (4) · explosive à réaction en chaîne (5) · MOUCHE-ZILLA (6).
- **Environnements avec règle** : Cuisine (elles tournent autour de la nourriture) · Salle de bain (niv. 4, rideau où elles se cachent) · Jardin (niv. 8, ×1,3 vitesse, plus d'abeilles).
- **Rétention** : 3 défis/jour (déterministes par date), série de connexion, événement week-end « INVASION », records, collection de tapettes, mouches d'accueil à écraser avant même de jouer.
- **Économie** : une seule monnaie (🪙), gagnée en jouant. Tapettes = cosmétiques purs (mêmes dégâts/hitbox).
- **Identité** : style sticker (contours encre, ombres dures), palette encre #1b1020 / jaune #ffc933 / vert éclaboussure #7bd33f / tomate #ff4b3e. Sons synthétisés (WebAudio) : la hauteur du SPLAT monte avec le combo.

## Monétisation (réglages dans `js/config.js`)
1. **Rewarded (prioritaire, volontaire)** : « +10 s » en fin de manche, « doubler les pièces ».
2. **Interstitiel rare** : seulement au retour à l'accueil, après ≥3 parties, toutes les 4 parties, 3 min de cooldown, jamais en partie.
3. **Remove Ads** (3,99 €) : bouton dans les réglages, achat in-app à brancher.
4. Cosmétiques en pièces. Aucun pay-to-win.

## RGPD / vie privée
Écran de consentement après la 1re manche (jamais avant le fun), choix « Accepter » ou « non personnalisées » (équivalent en gameplay). Aucune donnée personnelle, sauvegarde locale. Analytics anonymes, locales, **désactivées** par défaut (`CFG.analytics`). `privacy.html` est un modèle à compléter. ATT iOS : non nécessaire tant qu'on reste en pubs non personnalisées ; sinon l'afficher avant le SDK.

## Architecture
`config.js` équilibrage · `save.js` sauvegarde · `audio.js` sons + haptics · `services.js` analytics + pubs (provider factice à remplacer) · `game.js` mouches/input/score/rendu · `ui.js` écrans, missions, boutique.

## Reste à faire avant publication
- Brancher AdMob + achat in-app (Capacitor) ; remplacer `Ads.mock` et `btnNoAds`.
- Haptics iOS : Safari ignore `navigator.vibrate`, brancher `@capacitor/haptics` dans `Hap`.
- Icônes PNG des stores, politique de confidentialité réelle, test sur vrais appareils.
- Équilibrage à affiner avec de vrais joueurs (vitesses, seuils de niveau, prix).
