/**
 * Hook for loading and resolving locale strings.
 */

'use client';

import { useMemo } from 'react';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { FALLBACK_LANGUAGE, DEFAULT_LANGUAGE } from '@/lib/constants';
import type { Language } from '@/lib/types/index';

import ar from '@/locales/ar.json';
import bn from '@/locales/bn.json';
import de from '@/locales/de.json';
import en from '@/locales/en.json';
import es from '@/locales/es.json';
import fr from '@/locales/fr.json';
import hi from '@/locales/hi.json';
import id from '@/locales/id.json';
import ja from '@/locales/ja.json';
import ko from '@/locales/ko.json';
import mr from '@/locales/mr.json';
import pt from '@/locales/pt.json';
import ru from '@/locales/ru.json';
import te from '@/locales/te.json';
import tr from '@/locales/tr.json';
import ur from '@/locales/ur.json';
import vi from '@/locales/vi.json';
import zh from '@/locales/zh.json';

type LocaleData = Record<string, unknown>;

const locales: Record<Language, LocaleData> = {
  ar,
  bn,
  de,
  en,
  es,
  fr,
  hi,
  id,
  ja,
  ko,
  mr,
  pt,
  ru,
  te,
  tr,
  ur,
  vi,
  zh,
};

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

function resolveTranslation(language: Language, key: string, fallback?: string) {
  const preferred = getNestedValue(locales[language], key);
  if (preferred) {
    return preferred;
  }

  if (language !== DEFAULT_LANGUAGE) {
    const defaultValue = getNestedValue(locales[DEFAULT_LANGUAGE], key);
    if (defaultValue) {
      return defaultValue;
    }
  }

  if (language !== FALLBACK_LANGUAGE) {
    const fallbackValue = getNestedValue(locales[FALLBACK_LANGUAGE], key);
    if (fallbackValue) {
      return fallbackValue;
    }
  }

  return fallback ?? key;
}

export function useTranslations() {
  const { language } = useLanguage();

  const t = useMemo(() => {
    return (key: string, params?: Record<string, string | number>, fallback?: string): string => {
      let value = resolveTranslation(language, key, fallback);

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

export function getTranslation(language: Language, key: string, fallback?: string): string {
  return resolveTranslation(language, key, fallback);
}
