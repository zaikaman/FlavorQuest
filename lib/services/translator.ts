/**
 * Translator Service
 * Translate text using OpenAI-compatible API
 */

import { createOpenAIClient, getOpenAIModel } from '@/lib/services/openai-client';

interface TranslationResponse {
  en: string;
  ja: string;
  fr: string;
  ko: string;
  zh: string;
  [key: string]: string;
}

export async function translateText(text: string): Promise<TranslationResponse> {
  const client = createOpenAIClient();
  const model = getOpenAIModel();

  const systemPrompt = `You are a professional translator. Translate the following Vietnamese text into English (en), Japanese (ja), French (fr), Korean (ko), and Chinese Simplified (zh).
    Return ONLY a valid JSON object with keys: en, ja, fr, ko, zh. Do not add any markdown formatting or extra text.`;

  try {
    const data = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: text,
        },
      ],
      temperature: 0.1,
      top_p: 1,
      max_tokens: 100000,
    });

    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content received from translation API');
    }

    const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim();

    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Translation error:', error);
    throw error;
  }
}
