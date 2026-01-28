/**
 * LanguageSelector Component
 * T095 - Language Pills cho welcome screen và settings
 */

'use client';

import { useLanguage } from '@/lib/contexts/LanguageContext';
import type { Language } from '@/lib/types/index';

interface LanguageSelectorProps {
  /** Hiển thị đầy đủ hay rút gọn: compact (3), splash (6 dạng 2 hàng), full (6 dạng grid) */
  variant?: 'compact' | 'splash' | 'full';
  /** Custom className */
  className?: string;
}

const LANGUAGE_FLAGS: Record<Language, string> = {
  vi: '🇻🇳',
  en: '🇬🇧',
  ja: '🇯🇵',
  fr: '🇫🇷',
  ko: '🇰🇷',
  zh: '🇨🇳',
};

const LANGUAGE_LABELS: Record<Language, string> = {
  vi: 'VN',
  en: 'EN',
  ja: 'JP',
  fr: 'FR',
  ko: 'KR',
  zh: 'ZH',
};

export function LanguageSelector({ variant = 'compact', className = '' }: LanguageSelectorProps) {
  const { language, setLanguage, availableLanguages } = useLanguage();

  // Splash: 2 hàng x 3 cột (6 ngôn ngữ), Full: grid 3x2, Compact: 3 ngôn ngữ
  const displayLanguages = variant === 'compact' 
    ? availableLanguages.filter(l => ['vi', 'en', 'zh'].includes(l.code))
    : availableLanguages;

  // Splash variant - hiển thị 6 ngôn ngữ dạng 2 hàng
  if (variant === 'splash') {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        {/* Hàng 1: vi, en, zh */}
        <div className="flex p-1 gap-1 bg-black/40 backdrop-blur-md rounded-xl border border-white/5">
          {availableLanguages.filter(l => ['vi', 'en', 'zh'].includes(l.code)).map((lang) => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={`
                flex h-9 min-w-[4rem] items-center justify-center gap-1.5 rounded-lg 
                text-sm font-bold transition-all active:scale-95
                ${
                  language === lang.code
                    ? 'bg-primary text-white shadow-sm'
                    : 'hover:bg-white/10 text-gray-400 hover:text-white font-medium'
                }
              `}
            >
              <span className="text-base">{LANGUAGE_FLAGS[lang.code]}</span>
              <span>{LANGUAGE_LABELS[lang.code]}</span>
            </button>
          ))}
        </div>
        {/* Hàng 2: ja, ko, fr */}
        <div className="flex p-1 gap-1 bg-black/40 backdrop-blur-md rounded-xl border border-white/5">
          {availableLanguages.filter(l => ['ja', 'ko', 'fr'].includes(l.code)).map((lang) => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={`
                flex h-9 min-w-[4rem] items-center justify-center gap-1.5 rounded-lg 
                text-sm font-bold transition-all active:scale-95
                ${
                  language === lang.code
                    ? 'bg-primary text-white shadow-sm'
                    : 'hover:bg-white/10 text-gray-400 hover:text-white font-medium'
                }
              `}
            >
              <span className="text-base">{LANGUAGE_FLAGS[lang.code]}</span>
              <span>{LANGUAGE_LABELS[lang.code]}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'full') {
    return (
      <div className={`grid grid-cols-3 gap-2 ${className}`}>
        {displayLanguages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all active:scale-95 ${
              language === lang.code
                ? 'bg-primary border-primary text-white'
                : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
            }`}
          >
            <span className="text-lg">{LANGUAGE_FLAGS[lang.code]}</span>
            <span className="text-sm font-medium">{LANGUAGE_LABELS[lang.code]}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={`flex p-1 gap-1 bg-black/40 backdrop-blur-md rounded-xl border border-white/5 ${className}`}>
      {displayLanguages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => setLanguage(lang.code)}
          className={`
            flex h-9 min-w-[3.5rem] items-center justify-center rounded-lg 
            text-sm font-bold transition-all active:scale-95
            ${
              language === lang.code
                ? 'bg-primary text-white shadow-sm'
                : 'hover:bg-white/10 text-gray-400 hover:text-white font-medium'
            }
          `}
        >
          {LANGUAGE_LABELS[lang.code]}
        </button>
      ))}
    </div>
  );
}
