/**
 * Translator Service
 * Translate text using OpenAI-compatible API
 */

import { createHash } from 'node:crypto';
import { createOpenAIClient, getOpenAIModel } from '@/lib/services/openai-client';
import { runWithConcurrency } from '@/lib/utils/async';

interface TranslationResponse {
  en: string;
  ja: string;
  fr: string;
  ko: string;
  zh: string;
  [key: string]: string;
}

type TranslationLanguage = 'en' | 'ja' | 'fr' | 'ko' | 'zh';

const TARGET_LANGUAGES: readonly TranslationLanguage[] = ['en', 'ja', 'fr', 'ko', 'zh'];
const MAX_TRANSLATION_CONCURRENCY = 5;
const translationValueCache = new Map<string, string>();
const translationInFlightCache = new Map<string, Promise<string>>();

function normalizeTranslationText(text: string) {
  return text.trim();
}

function getTranslationCacheKey(text: string, language: TranslationLanguage) {
  return `${language}:${createHash('sha256').update(text).digest('hex')}`;
}

async function translateIntoLanguage(
  client: ReturnType<typeof createOpenAIClient>,
  model: string,
  text: string,
  language: TranslationLanguage
) {
  const normalizedText = normalizeTranslationText(text);
  const cacheKey = getTranslationCacheKey(normalizedText, language);
  const cachedValue = translationValueCache.get(cacheKey);

  if (cachedValue) {
    return cachedValue;
  }

  const inFlightValue = translationInFlightCache.get(cacheKey);
  if (inFlightValue) {
    return inFlightValue;
  }

  const systemPrompt = `You are a professional translator. Translate the user's Vietnamese text into ${getLanguageName(language)}.
Return only the translated text with natural product copy. Do not add explanations, quotes, markdown, or labels.`;

  const request = client.chat.completions
    .create({
      model,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: normalizedText,
        },
      ],
      temperature: 0,
      top_p: 1,
    })
    .then((data) => {
      const content = data.choices[0]?.message?.content?.trim();

      if (!content) {
        throw new Error(`No content received from translation API for ${language}`);
      }

      translationValueCache.set(cacheKey, content);
      return content;
    })
    .finally(() => {
      translationInFlightCache.delete(cacheKey);
    });

  translationInFlightCache.set(cacheKey, request);

  return request;
}

function getLanguageName(language: TranslationLanguage) {
  switch (language) {
    case 'en':
      return 'English';
    case 'ja':
      return 'Japanese';
    case 'fr':
      return 'French';
    case 'ko':
      return 'Korean';
    case 'zh':
      return 'Simplified Chinese';
    default:
      return language;
  }
}

export async function translateText(text: string): Promise<TranslationResponse> {
  const translationsByField = await translateTexts({ default: text });
  return translationsByField.default!;
}

export async function translateTexts(
  texts: Record<string, string>
): Promise<Record<string, TranslationResponse>> {
  const client = createOpenAIClient();
  const model = getOpenAIModel();
  const textEntries = Object.entries(texts)
    .map(([key, value]) => [key, normalizeTranslationText(value)] as const)
    .filter(([, value]) => value.length > 0);

  try {
    const taskFactories = textEntries.flatMap(([fieldKey, value]) =>
      TARGET_LANGUAGES.map((language) => async () => ({
        fieldKey,
        language,
        value: await translateIntoLanguage(client, model, value, language),
      }))
    );

    const translatedEntries = await runWithConcurrency(taskFactories, MAX_TRANSLATION_CONCURRENCY);
    const result: Record<string, TranslationResponse> = {};

    for (const [fieldKey] of textEntries) {
      result[fieldKey] = {
        en: '',
        ja: '',
        fr: '',
        ko: '',
        zh: '',
      };
    }

    for (const entry of translatedEntries) {
      result[entry.fieldKey]![entry.language] = entry.value;
    }

    return result;
  } catch (error) {
    console.error('Translation error:', error);
    throw error;
  }
}
