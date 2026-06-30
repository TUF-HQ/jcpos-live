/* JCPOS service worker: cache the app shell so it opens offline.
   Network first for the HTML so updates land; cache first for the rest. */
const CACHE = 'jcpos-v6';
const SHELL = [
  'index.html',
  'JCPOS_manifest.webmanifest',
  'icon.svg',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL).catch(()=>{})).then(()=>self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(()=>self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // Never cache Supabase API calls; always go to network.
  if (req.url.includes('supabase.co')) return;

  const isDoc = req.mode === 'navigate' || req.url.endsWith('.html');
  if (isDoc) {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then(r => r || caches.match('index.html')))
    );
    return;
  }
  e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => {
    const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy));
    return res;
  }).catch(()=>r)));
});
