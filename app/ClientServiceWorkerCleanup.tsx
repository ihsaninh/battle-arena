'use client';

import { useEffect } from 'react';

/**
 * TEMPORARY: Service Worker Cleanup Component
 *
 * This component helps clean up old service workers from user browsers.
 * It should be removed after 2-3 weeks when most active users have visited
 * the site and had their service workers cleaned up.
 *
 * Created: 2025-10-24
 * Remove after: 2025-11-15 (approximately 3 weeks)
 */
export function ClientServiceWorkerCleanup() {
  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    let isCleanedUp = false;

    const cleanup = async () => {
      try {
        // Check if there are any registered service workers
        const registrations = await navigator.serviceWorker.getRegistrations();

        if (registrations.length === 0) {
          return; // No SW to cleanup
        }

        console.log(
          '[SW Cleanup] Found service workers, initiating cleanup...'
        );

        // Try to register our cleanup SW
        try {
          await navigator.serviceWorker.register('/sw.js');
          console.log('[SW Cleanup] Cleanup service worker registered');
          isCleanedUp = true;
        } catch (registerError) {
          // If registration fails, manually unregister
          console.warn(
            '[SW Cleanup] Registration failed, manually unregistering...',
            registerError
          );

          for (const registration of registrations) {
            await registration.unregister();
          }

          // Clear all caches
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));

          console.log('[SW Cleanup] Manual cleanup completed');
          isCleanedUp = true;

          // Reload page for fresh content
          window.location.reload();
        }
      } catch (error) {
        console.error('[SW Cleanup] Error during cleanup:', error);
      }
    };

    // Run cleanup after a short delay to not block initial render
    const timeoutId = setTimeout(cleanup, 1000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  return null; // This component doesn't render anything
}
