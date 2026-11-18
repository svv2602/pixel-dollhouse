// Service worker «Пиксельного домика». Генерируется при сборке (см. vite.config.js).
// Стратегия: всё кэшируется при установке; запросы — сначала из кэша (игра работает без сети).
// Новая версия игры = новый VERSION -> новый кэш, старый удаляется.
const VERSION = '2c8f0a3629d8';
const FILES = ["./","./apple-touch-icon.png","./assets/index-DP_cr3G4.js","./assets/items/animal.png","./assets/items/clothing.png","./assets/items/drink.png","./assets/items/food.png","./assets/items/furniture.png","./assets/items/garden.png","./assets/items/items.json","./assets/items/kitchen.png","./assets/items/magic.png","./assets/items/music.png","./assets/items/toy.png","./assets/items/vehicle.png","./icon-192.png","./icon-512.png","./icon-maskable.png","./index.html","./manifest.webmanifest"];
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
