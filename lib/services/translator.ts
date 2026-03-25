/**
 * Translator service backed by the configured OpenAI-compatible API.
 */

import { createHash } from 'node:crypto';
import {
  LANGUAGE_CONFIG_MAP,
  NON_DEFAULT_LANGUAGE_CODES,
  type SupportedLanguageCode,
} from '@/lib/constants';
import { createOpenAIClient, getOpenAIModel } from '@/lib/services/openai-client';
import { runWithConcurrency } from '@/lib/utils/async';

type TranslationLanguage = Exclude<SupportedLanguageCode, 'vi'>;
type TranslationResponse = Record<TranslationLanguage, string>;
interface TranslateTextsOptions {
  targetLanguages?: TranslationLanguage[];
}

const TARGET_LANGUAGES = NON_DEFAULT_LANGUAGE_CODES as readonly TranslationLanguage[];
const MAX_TRANSLATION_CONCURRENCY = 100;
const translationValueCache = new Map<string, string>();
const translationInFlightCache = new Map<string, Promise<string>>();

function normalizeTranslationText(text: string) {
  return text.trim();
}

function getTranslationCacheKey(text: string, language: TranslationLanguage) {
  return `${language}:${createHash('sha256').update(text).digest('hex')}`;
}

function getLanguageName(language: TranslationLanguage) {
  return LANGUAGE_CONFIG_MAP[language].translationName;
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
      temperature: 1.0,
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

function createEmptyTranslationResponse(): TranslationResponse {
  return TARGET_LANGUAGES.reduce(
    (accumulator, language) => {
      accumulator[language] = '';
      return accumulator;
    },
    {} as TranslationResponse
  );
}

export async function translateText(text: string): Promise<TranslationResponse> {
  const translationsByField = await translateTexts({ default: text });
  return translationsByField.default ?? createEmptyTranslationResponse();
}

export async function translateTexts(
  texts: Record<string, string>,
  options: TranslateTextsOptions = {}
): Promise<Record<string, TranslationResponse>> {
  const client = createOpenAIClient();
  const model = getOpenAIModel();
  const targetLanguages =
    options.targetLanguages && options.targetLanguages.length > 0
      ? options.targetLanguages
      : TARGET_LANGUAGES;
  const textEntries = Object.entries(texts)
    .map(([key, value]) => [key, normalizeTranslationText(value)] as const)
    .filter(([, value]) => value.length > 0);

  try {
    const taskFactories = textEntries.flatMap(([fieldKey, value]) =>
      targetLanguages.map((language) => async () => ({
        fieldKey,
        language,
        value: await translateIntoLanguage(client, model, value, language),
      }))
    );

    const translatedEntries = await runWithConcurrency(taskFactories, MAX_TRANSLATION_CONCURRENCY);
    const result: Record<string, TranslationResponse> = {};

    for (const [fieldKey] of textEntries) {
      result[fieldKey] = createEmptyTranslationResponse();
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
