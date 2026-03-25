/**
 * Language selector used on the customer landing screen.
 */

'use client';

import { FEATURED_LANGUAGE_CODES } from '@/lib/constants';
import { useLanguage } from '@/lib/contexts/LanguageContext';

interface LanguageSelectorProps {
  variant?: 'compact' | 'splash' | 'full';
  className?: string;
}

export function LanguageSelector({ variant = 'compact', className = '' }: LanguageSelectorProps) {
  const { language, setLanguage, availableLanguages } = useLanguage();
  const featuredLanguageSet = new Set<string>(FEATURED_LANGUAGE_CODES);

  const featuredLanguages = availableLanguages.filter((item) => featuredLanguageSet.has(item.code));
  const extraLanguages = availableLanguages.filter((item) => !item.featured);
  const compactLanguages = featuredLanguages.slice(0, 6);
  const displayLanguages =
    variant === 'compact' ? compactLanguages : [...featuredLanguages, ...extraLanguages];

  const gridClassName =
    variant === 'compact' ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 md:grid-cols-3';

  if (variant === 'splash') {
    return (
      <div
        className={`w-full max-w-[29rem] rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(44,30,22,0.92),rgba(28,19,14,0.9))] p-3 text-white shadow-[0_28px_90px_rgba(0,0,0,0.34)] backdrop-blur-2xl ${className}`}
      >
        <div className="rounded-[26px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(0,0,0,0.1))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <div className="mb-4 flex items-center gap-3">
            <div className="text-primary flex h-11 w-11 items-center justify-center rounded-full bg-white/8">
              <span className="material-symbols-outlined text-[20px]">language</span>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold tracking-[0.22em] text-white/40 uppercase">
                {language.toUpperCase()}
              </p>
              <p className="truncate text-[1.05rem] font-semibold text-white">
                {availableLanguages.find((item) => item.code === language)?.nativeName ?? language}
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-[24px] border border-white/8 bg-black/14">
            <div className="custom-scrollbar max-h-[20.5rem] overflow-y-auto">
              {displayLanguages.map((lang, index) => {
                const isActive = language === lang.code;
                const isFeatured = featuredLanguageSet.has(lang.code);
                const isLast = index === displayLanguages.length - 1;

                return (
                  <button
                    key={`sheet-${lang.code}`}
                    type="button"
                    onClick={() => void setLanguage(lang.code)}
                    className={`flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors ${
                      isActive
                        ? 'bg-[linear-gradient(90deg,rgba(242,108,13,0.16),rgba(242,108,13,0.04))]'
                        : 'bg-transparent hover:bg-white/6'
                    } ${!isLast ? 'border-b border-white/8' : ''}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-[15px] font-semibold text-white">
                          {lang.nativeName}
                        </p>
                        {isFeatured && (
                          <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] font-semibold tracking-[0.16em] text-white/52 uppercase">
                            {lang.shortLabel}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-[13px] text-white/56">{lang.name}</p>
                    </div>
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                        isActive
                          ? 'border-primary bg-primary text-white shadow-[0_8px_20px_rgba(242,108,13,0.28)]'
                          : 'border-white/16 bg-transparent text-transparent'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">check</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-full max-w-[26rem] rounded-[24px] border border-white/10 bg-black/45 p-2 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl ${className}`}
    >
      <div className={`grid gap-2 ${gridClassName}`}>
        {displayLanguages.map((lang) => {
          const isActive = language === lang.code;

          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => void setLanguage(lang.code)}
              className={`group rounded-[18px] border px-3 py-3 text-left transition-all active:scale-[0.98] ${
                isActive
                  ? 'border-primary bg-primary/18 text-white shadow-[0_12px_30px_rgba(242,108,13,0.22)]'
                  : 'border-white/8 bg-white/6 text-white/88 hover:border-white/16 hover:bg-white/10'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className={`rounded-full px-2 py-1 text-[11px] font-semibold tracking-[0.22em] uppercase ${
                    isActive ? 'bg-white/18 text-white' : 'bg-white/8 text-white/58'
                  }`}
                >
                  {lang.shortLabel}
                </span>
                <span
                  className={`mt-0.5 h-2.5 w-2.5 rounded-full ${
                    isActive ? 'bg-primary' : 'bg-white/18 group-hover:bg-white/32'
                  }`}
                />
              </div>
              <p className="mt-3 text-sm leading-5 font-semibold">{lang.nativeName}</p>
              <p
                className={`mt-1 text-xs leading-4 ${isActive ? 'text-white/78' : 'text-white/54'}`}
              >
                {lang.name}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
