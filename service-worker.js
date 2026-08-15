// Service Worker do Top Cell
// Objetivo: deixar o app abrível offline (visual, botões, menu),
// mas NUNCA guardar em cache a planilha de estoque nem as fotos dos
// produtos — essas duas coisas sempre buscam dado novo na rede.

const CACHE_NAME = "topcell-shell-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-192-maskable.png",
  "./icon-512-maskable.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;

  // Planilha do Google e imagens de fora (imgbb etc.) -> sempre rede,
  // nunca cache, pra estoque/foto nunca ficar desatualizado.
  if (!isSameOrigin) {
    event.respondWith(fetch(event.request).catch(() => new Response("", { status: 504 })));
    return;
  }

  // Arquivos do próprio app -> cache-first, com atualização em segundo plano.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
