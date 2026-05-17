const CACHE_NAME = 'financas-casal-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Instala e faz cache dos arquivos estáticos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Limpa caches antigos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Estratégia: Network first para API, Cache first para estáticos
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Requisições da API: tenta network, sem cache
  if (url.pathname.startsWith('/api') || url.hostname !== self.location.hostname) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ error: 'Offline - sem conexão' }), {
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  // Arquivos estáticos: cache first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      });
    })
  );
});
