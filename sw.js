var CACHE_NAME = 'mt99-cache-v20';
var ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './css/base.css',
  './css/layout.css',
  './css/visuals.css',
  './css/quiz.css',
  './css/games.css',
  './css/print.css',
  './js/core.js',
  './js/ops.js',
  './js/mul.js',
  './js/div.js',
  './js/add.js',
  './js/sub.js',
  './js/storage.js',
  './js/voice-clips.js',
  './js/speech.js',
  './js/sound.js',
  './js/confetti.js',
  './js/badges.js',
  './js/visuals.js',
  './js/explore.js',
  './js/table.js',
  './js/quiz.js',
  './js/games.js',
  './js/print.js',
  './js/app.js'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(ASSETS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (key) {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var url = e.request.url;
  if (!url.startsWith('http://') && !url.startsWith('https://')) return;

  var isCodeAsset = e.request.mode === 'navigate' ||
    url.indexOf('.html') !== -1 ||
    url.indexOf('.js') !== -1 ||
    url.indexOf('.css') !== -1 ||
    url.indexOf('?v=') !== -1;

  if (isCodeAsset) {
    // Network-First for code assets so updates are immediate
    e.respondWith(
      fetch(e.request).then(function (res) {
        if (res && res.status === 200) {
          var clone = res.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(e.request, clone);
          });
        }
        return res;
      }).catch(function () {
        return caches.match(e.request);
      })
    );
    return;
  }

  // Cache-First for static media assets (audio, icons) with on-demand caching
  e.respondWith(
    caches.match(e.request).then(function (cached) {
      if (cached) return cached;
      return fetch(e.request).then(function (res) {
        if (!res || res.status !== 200 || (res.type !== 'basic' && res.type !== 'cors')) return res;
        var clone = res.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(e.request, clone);
        });
        return res;
      }).catch(function () {
        return cached;
      });
    })
  );
});
