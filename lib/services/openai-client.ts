import OpenAI from 'openai';

export function getOpenAIModel() {
  return process.env.OPENAI_MODEL || 'gemini-3-flash preview';
}

export function createOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = process.env.OPENAI_BASE_URL;

  if (!apiKey || !baseUrl) {
    throw new Error('Missing OPENAI_API_KEY or OPENAI_BASE_URL');
  }

  return new OpenAI({
    apiKey,
    baseURL: baseUrl,
    defaultHeaders: {
      'User-Agent': 'EzAI/1.0',
    },
  });
}
