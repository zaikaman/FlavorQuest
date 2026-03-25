/**
 * Service Worker Registration Component
 *
 * Client-side component để register service worker
 * và hiển thị thông báo khi có update mới
 */

'use client';

import { useEffect, useState } from 'react';
import { checkForUpdates, registerServiceWorker, skipWaitingAndActivate } from '@/lib/services/pwa';
import { Button } from '@/components/ui/Button';

export default function ServiceWorkerRegistration() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let checkInterval: ReturnType<typeof setInterval> | null = null;

    const syncWaitingState = (reg: ServiceWorkerRegistration) => {
      if (!isMounted) {
        return;
      }

      setRegistration(reg);
      setUpdateAvailable(Boolean(reg.waiting));
    };

    const setupRegistration = async () => {
      const reg = await registerServiceWorker();

      if (!reg || !isMounted) {
        return;
      }

      syncWaitingState(reg);

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) {
          return;
        }

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            syncWaitingState(reg);
          }
        });
      });

      checkInterval = setInterval(
        async () => {
          const hasUpdate = await checkForUpdates(reg);
          if (hasUpdate) {
            syncWaitingState(reg);
          }
        },
        60 * 60 * 1000
      );
    };

    void setupRegistration();

    return () => {
      isMounted = false;

      if (checkInterval) {
        clearInterval(checkInterval);
      }
    };
  }, []);

  const handleUpdate = async () => {
    if (!registration || isUpdating) {
      return;
    }

    setIsUpdating(true);

    try {
      const updated = await skipWaitingAndActivate(registration);

      if (!updated) {
        setUpdateAvailable(false);
      }
    } finally {
      setIsUpdating(false);
    }
  };

  if (!updateAvailable) {
    return null;
  }

  return (
    <div className="fixed right-4 bottom-4 left-4 z-[100] md:right-4 md:left-auto md:max-w-sm">
      <div className="border-primary-200 dark:border-primary-800 rounded-lg border bg-white p-4 shadow-lg dark:bg-gray-800">
        <h3 className="mb-2 text-base font-semibold text-gray-900 dark:text-white">
          Phiên bản mới có sẵn
        </h3>
        <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">
          Một phiên bản mới của FlavorQuest đã sẵn sàng. Cập nhật ngay để có trải nghiệm tốt nhất.
        </p>
        <div className="flex gap-2">
          <Button onClick={() => void handleUpdate()} size="sm" fullWidth isLoading={isUpdating}>
            Cập nhật ngay
          </Button>
          <Button
            onClick={() => setUpdateAvailable(false)}
            variant="ghost"
            size="sm"
            disabled={isUpdating}
          >
            Để sau
          </Button>
        </div>
      </div>
    </div>
  );
}
