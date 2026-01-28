/**
 * useTranslations Hook
 * Load và sử dụng translations cho multi-language support
 * 
 * Features:
 * - Load JSON locale files
 * - Nested key lookup (e.g., 'splash.subtitle')
 * - Fallback to Vietnamese if translation missing
 * - Reactive với language changes
 */

'use client';

import { useMemo } from 'react';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import type { Language } from '@/lib/types/index';

// Import all locale files
import vi from '@/locales/vi.json';
import en from '@/locales/en.json';
import ja from '@/locales/ja.json';
import ko from '@/locales/ko.json';
import zh from '@/locales/zh.json';
import fr from '@/locales/fr.json';

// Type for locale data
type LocaleData = Record<string, unknown>;

// Map language codes to locale data
const locales: Record<Language, LocaleData> = {
  vi,
  en,
  ja,
  ko,
  zh,
  fr,
};

/**
 * Get nested value from object using dot notation
 * @param obj - Object to get value from
 * @param path - Dot-separated path (e.g., 'splash.subtitle')
 * @returns Value at path or undefined
 */
function getNestedValue(obj: LocaleData, path: string): string | undefined {
  const keys = path.split('.');
  let current: unknown = obj;
  
  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  
  return typeof current === 'string' ? current : undefined;
}

/**
 * Hook to get translations
 * 
 * @returns Translation function and current language
 * 
 * @example
 * ```tsx
 * const { t, language } = useTranslations();
 * 
 * return (
 *   <h1>{t('splash.subtitle')}</h1>
 *   <p>{t('tour.nowPlaying', { name: 'Bánh Xèo' })}</p>
 * );
 * ```
 */
export function useTranslations() {
  const { language } = useLanguage();
  
  const t = useMemo(() => {
    return (key: string, params?: Record<string, string | number>, fallback?: string): string => {
      // Try current language first
      const currentLocale = locales[language];
      let value = getNestedValue(currentLocale, key);
      
      if (!value) {
        // Fallback to Vietnamese
        if (language !== 'vi') {
          value = getNestedValue(locales.vi, key);
        }
      }
      
      if (!value) {
        // Fallback to English
        if (language !== 'en') {
          value = getNestedValue(locales.en, key);
        }
      }
      
      if (!value) {
        // Return custom fallback or key itself
        return fallback ?? key;
      }
      
      // Replace placeholders like {name}, {count} with params
      if (params) {
        for (const [paramKey, paramValue] of Object.entries(params)) {
          value = value.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
        }
      }
      
      return value;
    };
  }, [language]);
  
  return { t, language };
}

/**
 * Get translation for a specific language (không dùng hook)
 * Useful for server components hoặc nơi không dùng được hooks
 * 
 * @param language - Language code
 * @param key - Translation key
 * @param fallback - Fallback value
 */
export function getTranslation(language: Language, key: string, fallback?: string): string {
  const currentLocale = locales[language];
  let value = getNestedValue(currentLocale, key);
  
  if (value) {
    return value;
  }
  
  // Fallback to Vietnamese
  if (language !== 'vi') {
    value = getNestedValue(locales.vi, key);
    if (value) {
      return value;
    }
  }
  
  // Fallback to English
  if (language !== 'en') {
    value = getNestedValue(locales.en, key);
    if (value) {
      return value;
    }
  }
  
  return fallback ?? key;
}
