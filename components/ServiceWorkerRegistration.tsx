/**
 * Service Worker Registration Component
 * 
 * Client-side component để register service worker
 * và hiển thị thông báo khi có update mới
 */

'use client';

import { useEffect, useState } from 'react';
import { registerServiceWorker, checkForUpdates } from '@/lib/services/pwa';
import { Button } from '@/components/ui/Button';

export default function ServiceWorkerRegistration() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // Register service worker on mount
    registerServiceWorker().then((reg: ServiceWorkerRegistration | null) => {
      if (reg) {
        setRegistration(reg);

        // Check for updates
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker installed and waiting
                setUpdateAvailable(true);
              }
            });
          }
        });

        // Check for updates periodically
        const checkInterval = setInterval(async () => {
          const hasUpdate = await checkForUpdates(reg);
          if (hasUpdate) {
            setUpdateAvailable(true);
          }
        }, 60 * 60 * 1000); // Check every hour

        return () => clearInterval(checkInterval);
      }
    });
  }, []);

  const handleUpdate = () => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });

      // Reload after activation
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }
  };

  // Don't render anything if no update available
  if (!updateAvailable) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[100] md:left-auto md:right-4 md:max-w-sm">
      <div className="rounded-lg border border-primary-200 bg-white p-4 shadow-lg dark:border-primary-800 dark:bg-gray-800">
        <h3 className="mb-2 text-base font-semibold text-gray-900 dark:text-white">
          Phiên bản mới có sẵn
        </h3>
        <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">
          Một phiên bản mới của FlavorQuest đã sẵn sàng. Cập nhật ngay để có trải nghiệm tốt nhất.
        </p>
        <div className="flex gap-2">
          <Button onClick={handleUpdate} size="sm" fullWidth>
            Cập nhật ngay
          </Button>
          <Button
            onClick={() => setUpdateAvailable(false)}
            variant="ghost"
            size="sm"
          >
            Để sau
          </Button>
        </div>
      </div>
    </div>
  );
}
