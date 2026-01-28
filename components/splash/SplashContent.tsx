/**
 * SplashContent Component
 * Hiển thị nội dung splash screen với dynamic translations
 * 
 * Features:
 * - Thay đổi ngôn ngữ real-time
 * - LanguageSelector với 6 ngôn ngữ
 * - StartTourButton với text localized
 */

'use client';

import Link from 'next/link';
import { StartTourButton } from '@/components/tour/StartTourButton';
import { LanguageSelector } from '@/components/layout/LanguageSelector';
import { useTranslations } from '@/lib/hooks/useTranslations';

interface SplashContentProps {
  isAuthenticated: boolean;
}

export function SplashContent({ isAuthenticated }: SplashContentProps) {
  const { t } = useTranslations();

  return (
    <>
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
      <div className="flex flex-col items-center w-full gap-5">
        {/* Language Pills - 6 ngôn ngữ */}
        <LanguageSelector variant="splash" />

        {/* Primary Action Button */}
        <StartTourButton isAuthenticated={isAuthenticated} />

        {/* Secondary Links */}
        <div className="flex items-center gap-6 mt-1 text-sm font-medium text-gray-400">
          <Link
            href="/browse"
            className="hover:text-white transition-colors py-2 flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-lg">explore</span>
            {t('splash.browse')}
          </Link>
          <div className="w-1 h-1 rounded-full bg-gray-600"></div>
          <Link
            href="/settings"
            className="hover:text-white transition-colors py-2 flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-lg">settings</span>
            {t('splash.settings')}
          </Link>
        </div>
      </div>
    </>
  );
}
