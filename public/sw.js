// Self-unregistering service worker for cleanup
// This file will automatically unregister old service workers from user browsers
// and can be safely removed after 2-3 weeks when all users have been cleaned up

self.addEventListener('install', () => {
  // Force this SW to activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      // Unregister this service worker
      await self.registration.unregister();

      // Clear all caches
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));

      // Get all clients (open tabs/windows)
      const clients = await self.clients.matchAll({ type: 'window' });

      // Reload all clients to get fresh content
      clients.forEach(client => {
        client.navigate(client.url);
      });
    })()
  );
});

// Handle fetch events during cleanup
self.addEventListener('fetch', event => {
  // Pass through - don't intercept requests during cleanup
  event.respondWith(fetch(event.request));
});
