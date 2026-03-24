/**
 * Helpers for working with multilingual POI and tour content.
 */

import {
  DEFAULT_LANGUAGE,
  FALLBACK_LANGUAGE,
  SUPPORTED_LANGUAGE_CODES,
  getLocalizedFieldName,
} from '@/lib/constants';
import type { Language, LocalizedPOI, LocalizedTour, POI, Tour } from '@/lib/types/index';

function readLocalizedValue<T extends POI | Tour>(
  entity: T,
  baseField: 'name' | 'description' | 'audio_url',
  language: Language,
  fallback: Language = DEFAULT_LANGUAGE
) {
  const localizedKey = getLocalizedFieldName(baseField, language) as keyof T;
  const localizedValue = entity[localizedKey];

  if (typeof localizedValue === 'string' && localizedValue.trim().length > 0) {
    return localizedValue;
  }

  const fallbackKey = getLocalizedFieldName(baseField, fallback) as keyof T;
  const fallbackValue = entity[fallbackKey];
  return typeof fallbackValue === 'string' ? fallbackValue : '';
}

export function getLocalizedName(poi: POI, language: Language): string {
  return readLocalizedValue(poi, 'name', language, DEFAULT_LANGUAGE) || poi.name_vi;
}

export function getLocalizedDescription(poi: POI, language: Language): string {
  return readLocalizedValue(poi, 'description', language, DEFAULT_LANGUAGE);
}

export function getLocalizedAudioUrl(poi: POI, language: Language): string {
  const localizedAudio = readLocalizedValue(poi, 'audio_url', language, DEFAULT_LANGUAGE);
  if (localizedAudio) {
    return localizedAudio;
  }

  return readLocalizedValue(poi, 'audio_url', FALLBACK_LANGUAGE, DEFAULT_LANGUAGE);
}

export function getLocalizedPOI(poi: POI, language: Language): LocalizedPOI {
  return {
    ...poi,
    name: getLocalizedName(poi, language),
    description: getLocalizedDescription(poi, language),
    audio_url: getLocalizedAudioUrl(poi, language),
  };
}

export function hasTranslation(poi: POI, language: Language): boolean {
  const nameKey = getLocalizedFieldName('name', language) as keyof POI;
  const descriptionKey = getLocalizedFieldName('description', language) as keyof POI;

  const hasName = typeof poi[nameKey] === 'string' && String(poi[nameKey]).trim().length > 0;
  const hasDescription =
    typeof poi[descriptionKey] === 'string' && String(poi[descriptionKey]).trim().length > 0;

  return hasName && hasDescription;
}

export function getAvailableLanguages(poi: POI): Language[] {
  return SUPPORTED_LANGUAGE_CODES.filter((language) => {
    if (language === DEFAULT_LANGUAGE) {
      return true;
    }

    return hasTranslation(poi, language);
  });
}

export function getTranslationCompleteness(poi: POI): number {
  const completed = SUPPORTED_LANGUAGE_CODES.filter((language) =>
    language === DEFAULT_LANGUAGE ? true : hasTranslation(poi, language)
  ).length;

  return Math.round((completed / SUPPORTED_LANGUAGE_CODES.length) * 100);
}

export function getLocalizedTourName(tour: Tour, language: Language): string {
  return readLocalizedValue(tour, 'name', language, DEFAULT_LANGUAGE) || tour.name_vi;
}

export function getLocalizedTourDescription(tour: Tour, language: Language): string {
  return readLocalizedValue(tour, 'description', language, DEFAULT_LANGUAGE);
}

export function getLocalizedTour(tour: Tour, language: Language): LocalizedTour {
  return {
    id: tour.id,
    name: getLocalizedTourName(tour, language),
    description: getLocalizedTourDescription(tour, language),
    cover_image_url: tour.cover_image_url,
    estimated_duration_min: tour.estimated_duration_min,
    poi_ids: tour.poi_ids,
    is_active: tour.is_active,
  };
}
