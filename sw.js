/* ===========================================================================
 * Curio — service worker
 * ---------------------------------------------------------------------------
 * Il fait deux choses, et rien d'autre :
 *
 *   1. il garde l'application elle-même (app.html, le manifeste, les icônes)
 *      pour qu'elle s'ouvre instantanément, même sans réseau ;
 *   2. il garde les anecdotes déjà téléchargées, pour qu'on puisse relire
 *      hors ligne ce qu'on a déjà ouvert.
 *
 * Les fiches sont servies « réseau d'abord » : on prend toujours la version
 * la plus récente si elle est disponible, et on retombe sur la copie locale
 * sinon. C'est ce qui permet d'ajouter des anecdotes sans que personne ait à
 * vider quoi que ce soit.
 *
 * La ligne VERSION ci-dessous est réécrite par ./build.sh à chaque
 * construction, avec l'empreinte réelle de app.html et index.html. Changer de
 * version efface proprement les anciens caches.
 *
 * L'application elle-même est servie RÉSEAU D'ABORD : sinon un déploiement
 * n'atteint jamais les gens qui ont déjà ouvert le site, et on passe des
 * heures à chercher un bug déjà corrigé. Le cache reste le filet hors ligne ;
 * il ne décide plus de ce qui s'affiche.
 * ======================================================================== */

const VERSION = 'curio-8.5.5+5ce677d082';   /* BUILD:VERSION */
const COQUILLE = VERSION + '-app';     // l'application
const CONTENU  = VERSION + '-txt';     // les anecdotes

const ESSENTIELS = [
  'app.html',
  'index.html',
  'manifest.webmanifest',
  'icones/curio-192.png',
  'icones/curio-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(COQUILLE);
    // on n'échoue jamais l'installation pour un fichier manquant
    await Promise.all(ESSENTIELS.map(u => c.add(u).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const noms = await caches.keys();
    await Promise.all(noms.filter(n => !n.startsWith(VERSION)).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

/* Un message de l'application peut forcer la mise à jour immédiate. */
self.addEventListener('message', e => {
  if (e.data === 'maintenant') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const memeOrigine = url.origin === self.location.origin;

  /* --- les anecdotes et le catalogue : réseau d'abord, cache en secours --- */
  if (memeOrigine && /\.json$/.test(url.pathname)) {
    e.respondWith((async () => {
      try {
        const r = await fetch(req);
        if (r && r.ok) (await caches.open(CONTENU)).put(req, r.clone());
        return r;
      } catch (_) {
        const c = await caches.match(req);
        if (c) return c;
        return new Response('{}', { headers: { 'Content-Type': 'application/json' } });
      }
    })());
    return;
  }

  /* --- l'application : RÉSEAU D'ABORD, cache en secours -------------------
     app.html et index.html contiennent tout le code. S'ils étaient servis
     depuis le cache, un correctif déployé resterait invisible pour tous ceux
     qui ont ouvert le site une fois. On demande donc toujours au réseau, et
     on ne retombe sur la copie locale que s'il ne répond pas. */
  const estDocument = req.mode === 'navigate' || /\.html?$/.test(url.pathname) || url.pathname.endsWith('/');
  if (memeOrigine && estDocument) {
    e.respondWith((async () => {
      try {
        const r = await fetch(req);
        if (r && r.ok) (await caches.open(COQUILLE)).put(req, r.clone());
        return r;
      } catch (_) {
        const c = await caches.match(req);
        if (c) return c;
        const app = await caches.match('app.html');
        if (app) return app;
        return new Response('', { status: 504 });
      }
    })());
    return;
  }

  /* --- le reste du même domaine (icônes, manifeste) : cache d'abord -------
     Ces fichiers ne changent qu'avec la version, et le nom du cache change
     avec elle : les servir depuis le cache est sans risque. */
  if (memeOrigine) {
    e.respondWith((async () => {
      const c = await caches.match(req);
      const reseau = fetch(req).then(r => {
        if (r && r.ok) caches.open(COQUILLE).then(k => k.put(req, r.clone()));
        return r;
      }).catch(() => null);
      if (c) { reseau; return c; }
      const r = await reseau;
      if (r) return r;
      return new Response('', { status: 504 });
    })());
    return;
  }

  /* --- tout le reste (Wikipédia, polices) : réseau, sans mise en cache --- */
});
