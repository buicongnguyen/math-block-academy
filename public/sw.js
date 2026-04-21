const CACHE_NAME = "math-block-academy-shell-v7";
const BASE_URL = new URL("./", self.location.href).pathname;
const APP_SHELL = [BASE_URL, `${BASE_URL}manifest.webmanifest`, `${BASE_URL}icons/icon.svg`];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(handleRequest(request));
});

async function handleRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok && shouldCache(request)) {
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    if (cachedResponse) {
      return cachedResponse;
    }

    if (request.mode === "navigate") {
      const appShell = await cache.match(BASE_URL);

      if (appShell) {
        return appShell;
      }
    }

    throw error;
  }
}

function shouldCache(request) {
  return request.mode === "navigate" || ["script", "style", "image", "font"].includes(request.destination);
}
