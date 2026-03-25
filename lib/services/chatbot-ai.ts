type ChatRole = 'user' | 'assistant';

interface ChatbotProviderMessage {
  role: ChatRole;
  content: string;
}

interface GeneratePreferredChatbotReplyParams {
  systemInstruction: string;
  context: string;
  messages: ChatbotProviderMessage[];
}

type ChatbotProvider = 'gemini' | 'openai';

interface ChatbotProviderResult {
  content: string;
  provider: ChatbotProvider;
}

interface GeminiPart {
  text?: string;
  thought?: boolean;
}

interface GeminiCandidate {
  content?: {
    parts?: GeminiPart[];
  };
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
  promptFeedback?: {
    blockReason?: string;
  };
}

interface OpenAIChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?:
        | string
        | Array<{
            type?: string;
            text?: string;
          }>;
    };
  }>;
}

const GEMINI_DEFAULT_BASE_URL = 'https://v98store.com/v1beta';
const GEMINI_DEFAULT_MODEL = 'gemini-2.5-pro';
const GEMINI_THINKING_BUDGET = 26240;
const OPENAI_DEFAULT_MODEL = 'gpt-5-nano';

function getOpenAIApiKey() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY');
  }

  return apiKey;
}

function getOpenAIBaseUrl() {
  const baseUrl = process.env.OPENAI_BASE_URL?.trim();

  if (!baseUrl) {
    throw new Error('Missing OPENAI_BASE_URL');
  }

  return baseUrl.replace(/\/+$/, '');
}

function getOpenAIModel() {
  return process.env.OPENAI_MODEL?.trim() || OPENAI_DEFAULT_MODEL;
}

function getGeminiApiKey() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY');
  }

  return apiKey;
}

function getGeminiModel() {
  return process.env.GEMINI_MODEL?.trim() || GEMINI_DEFAULT_MODEL;
}

function getGeminiApiRoot() {
  const configuredBaseUrl = process.env.GEMINI_BASE_URL?.trim();
  let baseUrl = configuredBaseUrl || GEMINI_DEFAULT_BASE_URL;

  baseUrl = baseUrl.replace(/\/+$/, '');

  if (baseUrl.endsWith('/v1')) {
    return `${baseUrl.slice(0, -3)}/v1beta`;
  }

  if (baseUrl.endsWith('/v1beta')) {
    return baseUrl;
  }

  return `${baseUrl}/v1beta`;
}

function buildGeminiEndpoint() {
  return `${getGeminiApiRoot()}/models/${encodeURIComponent(getGeminiModel())}:generateContent`;
}

function truncateErrorPayload(value: string) {
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length > 400 ? `${normalized.slice(0, 397)}...` : normalized;
}

function extractGeminiText(response: GeminiResponse) {
  for (const candidate of response.candidates ?? []) {
    const visibleParts =
      candidate.content?.parts?.filter(
        (part) => typeof part.text === 'string' && part.text.trim().length > 0 && part.thought !== true
      ) ?? [];

    if (visibleParts.length > 0) {
      return visibleParts.map((part) => part.text!.trim()).join('\n\n');
    }

    const fallbackParts =
      candidate.content?.parts?.filter(
        (part) => typeof part.text === 'string' && part.text.trim().length > 0
      ) ?? [];

    if (fallbackParts.length > 0) {
      return fallbackParts.map((part) => part.text!.trim()).join('\n\n');
    }
  }

  if (response.promptFeedback?.blockReason) {
    throw new Error(`Gemini blocked the prompt: ${response.promptFeedback.blockReason}`);
  }

  throw new Error('Gemini returned no visible text');
}

async function generateWithGemini({
  systemInstruction,
  context,
  messages,
}: GeneratePreferredChatbotReplyParams) {
  const requestBody = {
    systemInstruction: {
      parts: [
        {
          text: `${systemInstruction}\n\nFresh FlavorQuest context:\n${context}`,
        },
      ],
    },
    contents: messages.map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [
        {
          text: message.content,
        },
      ],
    })),
    generationConfig: {
      temperature: 1,
      topP: 1,
      thinkingConfig: {
        includeThoughts: true,
        thinkingBudget: GEMINI_THINKING_BUDGET,
      },
    },
  };

  const response = await fetch(buildGeminiEndpoint(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getGeminiApiKey()}`,
      'Content-Type': 'application/json',
      'User-Agent': 'EzAI/1.0',
    },
    body: JSON.stringify(requestBody),
  });

  const rawBody = await response.text();
  let parsedBody: GeminiResponse | null = null;

  if (rawBody) {
    try {
      parsedBody = JSON.parse(rawBody) as GeminiResponse;
    } catch {
      if (!response.ok) {
        throw new Error(
          `Gemini request failed with status ${response.status}: ${truncateErrorPayload(rawBody)}`
        );
      }
    }
  }

  if (!response.ok) {
    throw new Error(
      `Gemini request failed with status ${response.status}: ${truncateErrorPayload(rawBody)}`
    );
  }

  return extractGeminiText(parsedBody ?? {});
}

async function generateWithOpenAI({
  systemInstruction,
  context,
  messages,
}: GeneratePreferredChatbotReplyParams) {
  const response = await fetch(`${getOpenAIBaseUrl()}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getOpenAIApiKey()}`,
      'Content-Type': 'application/json',
      'User-Agent': 'EzAI/1.0',
    },
    body: JSON.stringify({
      model: getOpenAIModel(),
      temperature: 1,
      top_p: 1,
      max_tokens: 100000,
      messages: [
        {
          role: 'system',
          content: systemInstruction,
        },
        {
          role: 'system',
          content: `Fresh FlavorQuest context:\n${context}`,
        },
        ...messages,
      ],
    }),
  });

  const rawBody = await response.text();

  if (!response.ok) {
    throw new Error(
      `OpenAI fallback failed with status ${response.status}: ${truncateErrorPayload(rawBody)}`
    );
  }

  const completion = (rawBody
    ? (JSON.parse(rawBody) as OpenAIChatCompletionResponse)
    : {}) as OpenAIChatCompletionResponse;

  const content = completion.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No content received from OpenAI chatbot API');
  }

  if (typeof content === 'string') {
    return content.trim();
  }

  const joinedContent = content
    .filter(
      (part) => part.type === 'text' && typeof part.text === 'string' && part.text.trim().length > 0
    )
    .map((part) => part.text!.trim())
    .join('\n\n');

  if (!joinedContent) {
    throw new Error('No text content received from OpenAI chatbot API');
  }

  return joinedContent;
}

export async function generatePreferredChatbotReply(
  params: GeneratePreferredChatbotReplyParams
): Promise<ChatbotProviderResult> {
  try {
    const content = await generateWithGemini(params);
    return {
      content: content.trim(),
      provider: 'gemini',
    };
  } catch (error) {
    console.error('[ChatbotAI] Gemini request failed, falling back to OpenAI:', error);

    const content = await generateWithOpenAI(params);
    return {
      content,
      provider: 'openai',
    };
  }
}
