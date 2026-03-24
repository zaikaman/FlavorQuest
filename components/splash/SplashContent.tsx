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
        <div className="flex flex-col items-center justify-center flex-grow">
          {/* Logo Icon Composite */}
          <div className="relative mb-6 group">
            <div className="absolute -inset-1 bg-primary/30 rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
            <div className="relative w-24 h-24 bg-[#2c1e16]/80 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 shadow-2xl">
              <span className="material-symbols-outlined text-primary text-5xl drop-shadow-lg">restaurant</span>
              <span className="material-symbols-outlined text-white absolute -bottom-1 -right-1 bg-primary rounded-full p-1 text-sm border-4 border-[#2c1e16]">graphic_eq</span>
            </div>
          </div>

          {/* Headline */}
          <h1 className="text-white tracking-tight text-[40px] font-extrabold leading-tight text-center drop-shadow-xl">
            FlavorQuest
          </h1>

          {/* Sub-headline - Dynamic based on language */}
          <h2 className="text-gray-200 text-lg font-medium leading-relaxed tracking-wide mt-4 text-center max-w-[280px] drop-shadow-md opacity-90">
            {t('splash.subtitle')}
          </h2>
        </div>

        {/* Action Section (Bottom) */}
        <div className="flex flex-col items-center w-full gap-5 pb-12">
          {/* Language Pills */}
          <LanguageSelector variant="splash" />

          {/* Primary Action Button */}
          <StartTourButton isAuthenticated={isAuthenticated} />
        </div>
      </section>
    </>
  );
}
