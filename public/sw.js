const CACHE = "pamerproject-v5";
const ASSETS = [
  "/",
  "/manifest.json",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
];

// Install — cache critical assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches, ambil alih, lalu paksa SEMUA halaman/tab yang
// terbuka reload ke versi terbaru. Ini memutus siklus "perangkat masih
// menampilkan halaman lama" dari cache SW v1/v2 yang cache-first: begitu SW
// baru terpasang (skipWaiting), semua window langsung di-navigate ulang.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      await Promise.all(
        windows.map((win) => win.navigate(win.url).catch(() => {}))
      );
    })()
  );
});

// Fetch — network-first for pages, cache-first for static assets
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // Pass through non-GET (POST, PUT, DELETE, dll.) tanpa caching — Cache API
  // tidak mendukung put() untuk request non-GET. Server Actions Next.js dan
  // form submission mem-POST ke URL halaman, jadi harus dilewatkan langsung.
  if (request.method !== "GET") {
    event.respondWith(fetch(request).catch(() => new Response(null, { status: 503 })));
    return;
  }

  // API calls — network only, no cache
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(request).catch(() => new Response(null, { status: 503 })));
    return;
  }

  // Static assets — cache-first
  if (
    request.destination === "style" ||
    request.destination === "script" ||
    request.destination === "image" ||
    request.destination === "font"
  ) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
    return;
  }

  // Pages — network-first, fallback to cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, clone));
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || new Response(null, { status: 503 })))
  );
});
