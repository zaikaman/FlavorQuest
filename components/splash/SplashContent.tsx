/**
 * SplashContent Component
 * Hiển thị nội dung splash screen với dynamic translations
 *
 * Features:
 * - Thay đổi ngôn ngữ real-time
 * - LanguageSelector với danh sách ngôn ngữ mở rộng
 * - StartTourButton với text localized
 */

'use client';

import { useEffect } from 'react';
import { StartTourButton } from '@/components/tour/StartTourButton';
import { LanguageSelector } from '@/components/layout/LanguageSelector';
import {
  IPhoneBrowserInstallGuide,
  useShouldShowIPhoneInstallGuide,
} from '@/components/splash/IPhoneBrowserInstallGuide';
import { useTranslations } from '@/lib/hooks/useTranslations';
import { useAuth } from '@/lib/contexts/AuthContext';

interface SplashContentProps {
  isAuthenticated: boolean;
}

export function SplashContent({ isAuthenticated }: SplashContentProps) {
  const { t } = useTranslations();
  const { user, userRole, isLoading } = useAuth();
  const shouldShowIPhoneInstallGuide = useShouldShowIPhoneInstallGuide();

  useEffect(() => {
    console.log('[SplashContent] state:', {
      isAuthenticated,
      authUser: user?.email ?? null,
      userRole,
      isLoading,
    });
  }, [isAuthenticated, user, userRole, isLoading]);

  if (shouldShowIPhoneInstallGuide) {
    return <IPhoneBrowserInstallGuide />;
  }

  return (
    <>
      <section className="flex min-h-screen flex-col justify-between py-6">
        {/* Branding Section (Top/Center) */}
        <div className="flex flex-grow flex-col items-center justify-center">
          {/* Logo Icon Composite */}
          <div className="group relative mb-6">
            <div className="bg-primary/30 absolute -inset-1 rounded-full opacity-50 blur-xl transition-opacity group-hover:opacity-75"></div>
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-white/10 bg-[#2c1e16]/80 shadow-2xl backdrop-blur-md">
              <span className="material-symbols-outlined text-primary text-5xl drop-shadow-lg">
                restaurant
              </span>
              <span className="material-symbols-outlined bg-primary absolute -right-1 -bottom-1 rounded-full border-4 border-[#2c1e16] p-1 text-sm text-white">
                graphic_eq
              </span>
            </div>
          </div>

          {/* Headline */}
          <h1 className="text-center text-[40px] leading-tight font-extrabold tracking-tight text-white drop-shadow-xl">
            FlavorQuest
          </h1>

          {/* Sub-headline - Dynamic based on language */}
          <h2 className="mt-4 max-w-[280px] text-center text-lg leading-relaxed font-medium tracking-wide text-gray-200 opacity-90 drop-shadow-md">
            {t('splash.subtitle')}
          </h2>
        </div>

        {/* Action Section (Bottom) */}
        <div className="flex w-full flex-col items-center gap-5 pb-12">
          {/* Language Pills */}
          <LanguageSelector variant="splash" />

          {/* Primary Action Button */}
          <StartTourButton isAuthenticated={isAuthenticated} />
        </div>
      </section>
    </>
  );
}
