// Cache minimal : le jeu fonctionne hors ligne.
const V = 'bk-v2', FILES = ['./', 'index.html', 'style.css', 'manifest.json', 'icon.svg', 'privacy.html', 'js/config.js', 'js/save.js', 'js/audio.js', 'js/services.js', 'js/game.js', 'js/ui.js'];
self.addEventListener('install', e => e.waitUntil(caches.open(V).then(c => c.addAll(FILES))));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== V).map(x => caches.delete(x))))));
self.addEventListener('fetch', e => e.respondWith(fetch(e.request).catch(() => caches.match(e.request))));
