// Service worker «Пиксельного домика». Генерируется при сборке (см. vite.config.js).
// Стратегия: всё кэшируется при установке; запросы — сначала из кэша (игра работает без сети).
// Новая версия игры = новый VERSION -> новый кэш, старый удаляется.
const VERSION = '__VERSION__';
const FILES = __FILES__;
const CACHE = `pixel-house-${VERSION}`;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('pixel-house-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true, ignoreVary: true }).then((hit) => {
      if (hit) return hit;
      // навигация (открытие игры) без сети -> главная страница из кэша
      if (req.mode === 'navigate') return caches.match('./');
      return fetch(req);
    }),
  );
});
