// StoneValley — LE SERVICE WORKER DU PORTAIL (sw.js)
// Il garde les pages du portail, leur habillage et leurs images, pour que l'application installée s'ouvre sans réseau.
// Il est à la racine du site, donc il voit passer aussi les adresses des jeux (/stonevalley/, /Lisiere/…) : il n'y touche pas. Il ne
// répond que pour les fichiers du portail (DU_PORTAIL) ; tout le reste part au réseau comme s'il n'était pas là. Les jeux qui ont leur
// propre service worker gardent le leur. Rien du service de comptes n'est gardé : il est sur un autre site.
// Les pages, les scripts et les styles : le réseau d'abord (une nouvelle version se voit tout de suite), la copie gardée sinon.
// Les images et les polices : la copie gardée d'abord, rafraîchie en arrière-plan.
'use strict';
const CACHE = 'stonevalley-portail-2';
const SOCLE = ['./', 'jeu.html', 'compte.html', 'boutique.html', '404.html', 'manifest.webmanifest',
  'assets/site.css', 'assets/site.js', 'assets/jeux.js', 'assets/editeur.js', 'assets/compte.js',
  'assets/polices/AlegreyaSans-Regular.woff2', 'assets/polices/AlegreyaSans-Medium.woff2', 'assets/polices/AlegreyaSans-Bold.woff2',
  'images/favicon.svg', 'images/icones/icone-192.png',
  'images/jeux/stonevalley/couverture.jpg', 'images/jeux/lisiere/couverture.jpg', 'images/jeux/portefaix/couverture.jpg', 'images/jeux/braises/nuit.jpg', 'images/jeux/neuralarena/couverture.jpg', 'images/jeux/orvane/couverture.webp',
  'legal/cgu.html', 'legal/cgv.html', 'legal/confidentialite.html', 'legal/cookies.html', 'legal/mentions-legales.html'];
const RACINE = new URL('./', self.location).pathname;
const DU_PORTAIL = new RegExp('^' + RACINE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:$|index\\.html$|jeu\\.html$|compte\\.html$|boutique\\.html$|404\\.html$|manifest\\.webmanifest$|assets/|images/|legal/)');

self.addEventListener('install', e => {
  // (une image qui manque n'empêche pas l'installation)
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SOCLE.map(u => c.add(u).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(l => Promise.all(l.filter(n => n.startsWith('stonevalley-portail-') && n !== CACHE).map(n => caches.delete(n)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== self.location.origin || !DU_PORTAIL.test(u.pathname)) return;      // (pas au portail : on ne s'en mêle pas)
  const garder = rep => { if (rep && rep.ok) { const copie = rep.clone(); caches.open(CACHE).then(c => c.put(r, copie)); } return rep; };
  // (une page se retrouve quels que soient ses paramètres : jeu.html?j=lisiere se sert de la copie de jeu.html)
  const gardee = () => caches.match(r).then(x => x || caches.match(r, { ignoreSearch: true }));
  if (/\.(?:jpg|png|webp|svg|woff2)$/.test(u.pathname)) {
    e.respondWith(caches.match(r).then(x => { const frais = fetch(r).then(garder).catch(() => x); return x || frais; }));
    return;
  }
  e.respondWith(fetch(r).then(garder).catch(() => gardee().then(x => x || (r.mode === 'navigate' ? caches.match('./') : Response.error()))));
});
