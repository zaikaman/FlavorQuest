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

export interface StartTourButtonProps {
  onStart?: () => void;
  className?: string;
  disabled?: boolean;
  isAuthenticated: boolean;
}

export function StartTourButton({ onStart, className = '', disabled = false, isAuthenticated }: StartTourButtonProps) {
  const router = useRouter();
  const { language } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);

  const handleStart = async () => {
    if (disabled || isLoading) return;

    setIsLoading(true);

    try {
      // Log analytics
      await logTourStart(language);

      // Call optional callback
      if (onStart) {
        onStart();
      }

      // Navigate based on auth state
      if (isAuthenticated) {
        router.push('/tour');
      } else {
        router.push('/login');
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
      className={`
        w-full flex items-center justify-center rounded-xl h-14 px-6 
        bg-primary hover:bg-orange-600 text-white text-[17px] font-bold tracking-wide 
        shadow-lg shadow-orange-900/30 
        transition-all active:scale-[0.98] 
        group relative overflow-hidden
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {/* Shimmer effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>

      <span className="mr-2">
        {isLoading ? 'Đang tải...' : 'Bắt đầu Tour'}
      </span>

      {!isLoading && (
        <span className="material-symbols-outlined text-xl group-hover:translate-x-1 transition-transform">
          arrow_forward
        </span>
      )}
    </button>
  );
}
