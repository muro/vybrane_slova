const CACHE_NAME = 'vybrane-slova-v54';
const APP_SHELL = [
  './',
  './index.html',
  './engine.js',
  './data/disambiguation.tsv',
  './data/simple/b.txt',
  './data/simple/m.txt',
  './data/simple/p.txt',
  './data/simple/r.txt',
  './data/simple/s.txt',
  './data/simple/v.txt',
  './data/simple/z.txt',
  './fonts/nunito-latin.woff2',
  './fonts/nunito-latin-ext.woff2',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(
        APP_SHELL.map(asset => new Request(asset, { cache: 'reload' }))
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

function fetchAndCache(request) {
  return fetch(request).then(response => {
    if (response && response.ok) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
    }
    return response;
  });
}

function fromCache(request) {
  return caches.match(request, { ignoreSearch: true });
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetchAndCache(request)
        .catch(() => fromCache(request))
        .then(response => response || caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    fromCache(request)
      .then(cached => cached || fetchAndCache(request))
  );
});
