const CACHE_NAME = "cya-shell-v12";

const APP_SHELL = [
  "/",
  "/index.html",
  "/contact.html",
  "/events.html",
  "/fellowship.html",
  "/gallery.html",
  "/blog.html",
  "/blog-post.html",
  "/admin.html",
  "/admin-gallery.html",
  "/profile.html",
  "/reset-password.html",
  "/rev-patrick-odhiambo.jpg",
  "/pastor-jeffer-wambua.jpg",
  "/style.css",
  "/mobile-navbar.css",
  "/aos.css",
  "/aos.js",
  "/navbar.js",
  "/backend-origin.js",
  "/pwa.js",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/favicon.ico",
  "/favicon.png",
  "/logo.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  // API responses must stay fresh and are intentionally not cached here.
  if (url.pathname.startsWith("/api/") || url.pathname === "/runtime-config.js") {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  event.respondWith(cacheFirstAsset(request));
});

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request, { cache: "no-cache" });
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return (await caches.match(request)) || caches.match("/index.html");
  }
}

async function cacheFirstAsset(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return Response.error();
  }
}
