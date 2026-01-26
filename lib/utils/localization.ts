/**
 * Localization Helper
 * 
 * Helper functions để work với multi-language content
 * 
 * Features:
 * - Get localized field từ POI object
 * - Fallback to Vietnamese nếu language không có
 * - Type-safe với POI type
 */

import type { POI, Language, LocalizedPOI } from '@/lib/types/index';

/**
 * Get localized POI name
 * 
 * @param poi - POI object with multi-language names
 * @param language - Target language
 * @returns Localized name (fallback to Vietnamese if not available)
 * 
 * @example
 * ```ts
 * const poi = {
 *   name_vi: 'Bánh Xèo Bà Dưỡng',
 *   name_en: 'Ba Duong Crispy Pancake',
 *   name_ja: null,
 * };
 * 
 * getLocalizedName(poi, 'en'); // 'Ba Duong Crispy Pancake'
 * getLocalizedName(poi, 'ja'); // 'Bánh Xèo Bà Dưỡng' (fallback)
 * ```
 */
export function getLocalizedName(poi: POI, language: Language): string {
  const key = `name_${language}` as keyof POI;
  const name = poi[key];

  if (typeof name === 'string' && name.length > 0) {
    return name;
  }

  // Fallback to Vietnamese
  return poi.name_vi;
}

/**
 * Get localized POI description
 * 
 * @param poi - POI object with multi-language descriptions
 * @param language - Target language
 * @returns Localized description (fallback to Vietnamese if not available)
 */
export function getLocalizedDescription(poi: POI, language: Language): string {
  const key = `description_${language}` as keyof POI;
  const description = poi[key];

  if (typeof description === 'string' && description.length > 0) {
    return description;
  }

  // Fallback to Vietnamese or empty string
  return poi.description_vi ?? '';
}

/**
 * Get localized POI audio URL
 * 
 * @param poi - POI object with multi-language audio URLs
 * @param language - Target language
 * @returns Localized audio URL (empty string if not available)
 */
export function getLocalizedAudioUrl(poi: POI, language: Language): string {
  const key = `audio_url_${language}` as keyof POI;
  const audioUrl = poi[key];

  if (typeof audioUrl === 'string' && audioUrl.length > 0) {
    return audioUrl;
  }

  // Fallback to Vietnamese audio or empty string
  return (typeof poi.audio_url_vi === 'string' ? poi.audio_url_vi : '') ?? '';
}

/**
 * Get fully localized POI object
 * Convenience function that returns LocalizedPOI
 * 
 * @param poi - POI object
 * @param language - Target language
 * @returns LocalizedPOI with name, description, audioUrl in target language
 * 
 * @example
 * ```ts
 * const poi = { ... };
 * const localized = getLocalizedPOI(poi, 'en');
 * 
 * console.log(localized.name); // English name
 * console.log(localized.description); // English description
 * console.log(localized.audioUrl); // English audio URL
 * ```
 */
export function getLocalizedPOI(poi: POI, language: Language): LocalizedPOI {
  return {
    ...poi,
    name: getLocalizedName(poi, language),
    description: getLocalizedDescription(poi, language),
    audio_url: getLocalizedAudioUrl(poi, language),
  };
}

/**
 * Check if POI has translation for a language
 * 
 * @param poi - POI object
 * @param language - Language to check
 * @returns True if both name and description exist in target language
 */
export function hasTranslation(poi: POI, language: Language): boolean {
  const nameKey = `name_${language}` as keyof POI;
  const descKey = `description_${language}` as keyof POI;

  const hasName = typeof poi[nameKey] === 'string' && (poi[nameKey] as string).length > 0;
  const hasDesc = typeof poi[descKey] === 'string' && (poi[descKey] as string).length > 0;

  return hasName && hasDesc;
}

/**
 * Get available languages for a POI
 * 
 * @param poi - POI object
 * @returns Array of languages that have translations
 */
export function getAvailableLanguages(poi: POI): Language[] {
  const languages: Language[] = ['vi', 'en', 'ja', 'fr', 'ko', 'zh'];

  return languages.filter((lang) => {
    // Vietnamese always available
    if (lang === 'vi') return true;

    return hasTranslation(poi, lang);
  });
}

/**
 * Get translation completeness percentage
 * 
 * @param poi - POI object
 * @returns Percentage (0-100) of languages that have translations
 */
export function getTranslationCompleteness(poi: POI): number {
  const languages: Language[] = ['vi', 'en', 'ja', 'fr', 'ko', 'zh'];
  const completed = languages.filter((lang) => hasTranslation(poi, lang)).length;

  return Math.round((completed / languages.length) * 100);
}
