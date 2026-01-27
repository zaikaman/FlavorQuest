/**
 * PWA Lifecycle Service
 * 
 * Quản lý PWA lifecycle events:
 * - Service Worker registration
 * - Update notifications
 * - Install prompts
 * - Offline/online detection
 * 
 * Features:
 * - Auto-register service worker
 * - Check for updates
 * - Handle A2HS (Add to Home Screen) prompt
 * - Cache management
 */

'use client';

/**
 * PWA Installation State
 */
export type PWAInstallState = 'not-installed' | 'prompt-available' | 'installed' | 'unsupported';

/**
 * Service Worker Registration
 * 
 * @returns Promise resolving to ServiceWorkerRegistration or null
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.warn('Service Workers are not supported');
    return null;
  }

  // Disable SW in development to prevent caching issues
  if (process.env.NODE_ENV === 'development') {
    console.log('Service Worker registration disabled in development mode');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('Service Worker registered:', registration.scope);

    // Check for updates every hour
    setInterval(() => {
      registration.update();
    }, 60 * 60 * 1000);

    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Check for Service Worker updates
 * 
 * @param registration - ServiceWorkerRegistration object
 */
export async function checkForUpdates(
  registration: ServiceWorkerRegistration
): Promise<boolean> {
  try {
    await registration.update();
    return !!registration.waiting;
  } catch (error) {
    console.error('Failed to check for updates:', error);
    return false;
  }
}

/**
 * Skip waiting and activate new Service Worker immediately
 * 
 * @param registration - ServiceWorkerRegistration object
 */
export function skipWaitingAndActivate(registration: ServiceWorkerRegistration): void {
  registration.waiting?.postMessage({ type: 'SKIP_WAITING' });

  // Reload page after activation
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

/**
 * Get PWA installation state
 */
export function getPWAInstallState(): PWAInstallState {
  if (typeof window === 'undefined') {
    return 'unsupported';
  }

  // Check if already installed (standalone mode)
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return 'installed';
  }

  // Check if PWA is supported
  if (!('serviceWorker' in navigator) || !('BeforeInstallPromptEvent' in window)) {
    return 'unsupported';
  }

  return 'not-installed';
}

/**
 * BeforeInstallPrompt Event Interface
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Setup A2HS (Add to Home Screen) prompt
 * 
 * @param callback - Called when prompt is available or user accepts/dismisses
 */
export function setupInstallPrompt(
  callback: (event: BeforeInstallPromptEvent | null, outcome?: 'accepted' | 'dismissed') => void
): () => void {
  if (typeof window === 'undefined') {
    return () => { };
  }

  let deferredPrompt: BeforeInstallPromptEvent | null = null;

  const handleBeforeInstallPrompt = (e: Event) => {
    // Prevent default mini-infobar
    e.preventDefault();

    deferredPrompt = e as BeforeInstallPromptEvent;
    callback(deferredPrompt);
  };

  const handleAppInstalled = () => {
    deferredPrompt = null;
    callback(null, 'accepted');
  };

  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  window.addEventListener('appinstalled', handleAppInstalled);

  // Cleanup function
  return () => {
    window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.removeEventListener('appinstalled', handleAppInstalled);
  };
}

/**
 * Show A2HS prompt
 * 
 * @param promptEvent - BeforeInstallPromptEvent from setupInstallPrompt
 * @returns User choice outcome
 */
export async function showInstallPrompt(
  promptEvent: BeforeInstallPromptEvent
): Promise<'accepted' | 'dismissed'> {
  await promptEvent.prompt();
  const { outcome } = await promptEvent.userChoice;
  return outcome;
}

/**
 * Clear all caches
 * Useful for debugging or when user wants to free up storage
 */
export async function clearAllCaches(): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return;
  }

  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
    console.log('All caches cleared');
  } catch (error) {
    console.error('Failed to clear caches:', error);
  }
}

/**
 * Get cache storage estimate
 */
export async function getCacheSize(): Promise<{ usage: number; quota: number } | null> {
  if (typeof window === 'undefined' || !('storage' in navigator) || !('estimate' in navigator.storage)) {
    return null;
  }

  try {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage ?? 0,
      quota: estimate.quota ?? 0,
    };
  } catch (error) {
    console.error('Failed to get cache size:', error);
    return null;
  }
}

/**
 * Format bytes for display
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Check if app is running in standalone mode (PWA installed)
 */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

/**
 * Check if device is iOS
 */
export function isIOS(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

/**
 * Check if device supports PWA installation
 */
export function supportsPWA(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return 'serviceWorker' in navigator && 'PushManager' in window;
}
