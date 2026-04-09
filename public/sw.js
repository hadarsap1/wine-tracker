// Wine Tracker — Service Worker (pass-through, no caching)
// Intentionally minimal: installs immediately, claims all clients,
// and passes every request straight to the network.
// This ensures users always get the latest version on every load.

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// No fetch handler — browser handles all requests normally.
