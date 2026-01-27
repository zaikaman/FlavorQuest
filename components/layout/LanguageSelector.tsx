/**
 * LanguageSelector Component
 * Language Pills cho welcome screen và settings
 */

'use client';

import { useLanguage } from '@/lib/contexts/LanguageContext';

const LANGUAGE_LABELS: Record<string, string> = {
  vi: 'VN',
  en: 'EN',
  ja: 'JP',
  fr: 'FR',
  ko: 'KR',
  zh: 'ZH',
};

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage();

  // Show only top 3 languages on welcome screen
  const topLanguages = ['vi', 'en', 'zh'];

  return (
    <div className="flex p-1 gap-1 bg-black/40 backdrop-blur-md rounded-xl border border-white/5 mb-2">
      {topLanguages.map((lang) => (
        <button
          key={lang}
          onClick={() => setLanguage(lang as any)}
          className={`
            flex h-9 min-w-[3.5rem] items-center justify-center rounded-lg 
            text-sm font-bold transition-all active:scale-95
            ${
              language === lang
                ? 'bg-primary text-white shadow-sm'
                : 'hover:bg-white/10 text-gray-400 hover:text-white font-medium'
            }
          `}
        >
          {LANGUAGE_LABELS[lang]}
        </button>
      ))}
    </div>
  );
}
