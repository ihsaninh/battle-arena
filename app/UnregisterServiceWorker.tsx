'use client';

import { useEffect } from 'react';

/**
 * Component to unregister any existing service workers
 * This helps clean up old service workers that were removed from the codebase
 */
export function UnregisterServiceWorker() {
  useEffect(() => {
    // Only run in browser environment
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // Unregister all service workers
    navigator.serviceWorker
      .getRegistrations()
      .then(registrations => {
        for (const registration of registrations) {
          registration
            .unregister()
            .then(success => {
              if (success) {
                console.log('[SW] Service worker unregistered successfully');
              }
            })
            .catch(err => {
              console.error('[SW] Failed to unregister service worker:', err);
            });
        }
      })
      .catch(err => {
        console.error('[SW] Failed to get service worker registrations:', err);
      });

    // Also clear service worker caches
    if ('caches' in window) {
      caches
        .keys()
        .then(cacheNames => {
          return Promise.all(
            cacheNames.map(cacheName => {
              console.log('[SW] Deleting cache:', cacheName);
              return caches.delete(cacheName);
            })
          );
        })
        .catch(err => {
          console.error('[SW] Failed to clear caches:', err);
        });
    }
  }, []);

  return null;
}
