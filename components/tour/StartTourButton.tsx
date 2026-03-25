/**
 * StartTourButton Component
 * Unlock audio context và bắt đầu tour
 *
 * Required for:
 * - Browser autoplay policy compliance
 * - User gesture to enable audio
 * - Analytics tracking
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { logTourStart } from '@/lib/services/analytics';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { useTranslations } from '@/lib/hooks/useTranslations';
import { useAuth } from '@/lib/contexts/AuthContext';
import { primeSharedAudioElement } from '@/lib/services/audio-session';

export interface StartTourButtonProps {
  onStart?: () => void;
  className?: string;
  disabled?: boolean;
  isAuthenticated: boolean;
}

const AUTH_DESTINATION_TIMEOUT_MS = 3000;
const START_ACTION_TIMEOUT_MS = 1500;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeoutId: number | null = null;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = window.setTimeout(() => {
          reject(new Error(`${label} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      window.clearTimeout(timeoutId);
    }
  }
}

export function StartTourButton({
  onStart,
  className = '',
  disabled = false,
  isAuthenticated,
}: StartTourButtonProps) {
  const router = useRouter();
  const { language } = useLanguage();
  const { t } = useTranslations();
  const {
    isOwner,
    isPendingOwner,
    user,
    userRole,
    isLoading: authLoading,
    isRoleReady,
  } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const resolveAuthenticatedDestination = async (): Promise<string | null> => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      controller.abort(new Error('Timed out while fetching /api/users/me'));
    }, AUTH_DESTINATION_TIMEOUT_MS);

    try {
      const response = await fetch(`/api/users/me?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        if (response.status === 401) {
          return null;
        }

        throw new Error(`/api/users/me -> ${response.status}`);
      }

      const profile = (await response.json()) as {
        role?: 'customer' | 'pending-owner' | 'owner' | 'admin';
      };

      if (profile.role === 'admin') {
        return '/admin';
      }

      if (profile.role === 'owner') {
        return '/owner';
      }

      if (profile.role === 'pending-owner') {
        return '/pending-owner';
      }

      return '/tour';
    } catch (error) {
      console.warn('[StartTourButton] fallback to local auth snapshot:', error);
      if (!user) {
        return null;
      }

      return isOwner ? '/owner' : isPendingOwner ? '/pending-owner' : '/tour';
    } finally {
      window.clearTimeout(timeoutId);
    }
  };

  const handleStart = async () => {
    if (disabled || isLoading) return;

    setIsLoading(true);

    try {
      console.log('[StartTourButton] click:', {
        language,
        isAuthenticated,
        authUser: user?.email ?? null,
        userRole,
        isOwner,
        authLoading,
        isRoleReady,
      });

      // Đảm bảo language đã được lưu vào IndexedDB
      // Thêm delay nhỏ để tránh race condition với setLanguage
      await new Promise((resolve) => setTimeout(resolve, 150));
      await Promise.allSettled([
        withTimeout(primeSharedAudioElement(), START_ACTION_TIMEOUT_MS, 'primeSharedAudioElement'),
        withTimeout(logTourStart(language), START_ACTION_TIMEOUT_MS, 'logTourStart'),
      ]);

      if (onStart) {
        onStart();
      }

      console.log('[StartTourButton] deciding navigation');

      const destination = await resolveAuthenticatedDestination();
      if (destination) {
        console.log('[StartTourButton] push:', destination);
        router.push(destination);
      } else {
        console.log('[StartTourButton] push: /login?type=customer');
        router.push('/login?type=customer');
      }
    } catch (error) {
      console.error('Failed to start tour:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleStart}
      disabled={disabled || isLoading}
      className={`bg-primary group relative flex h-14 w-full items-center justify-center overflow-hidden rounded-xl px-6 text-[17px] font-bold tracking-wide text-white shadow-lg shadow-orange-900/30 transition-all hover:bg-orange-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${className} `}
    >
      {/* Shimmer effect */}
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-[shimmer_1.5s_infinite]"></div>

      <span className="mr-2">{isLoading ? t('common.loading') : t('splash.startTour')}</span>

      {!isLoading && (
        <span className="material-symbols-outlined text-xl transition-transform group-hover:translate-x-1">
          arrow_forward
        </span>
      )}
    </button>
  );
}
