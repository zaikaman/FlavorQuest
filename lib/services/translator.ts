
/**
 * Translator Service
 * Translate text using OpenAI-compatible API
 */

interface TranslationResponse {
    en: string;
    ja: string;
    fr: string;
    ko: string;
    zh: string;
    [key: string]: string;
}

export async function translateText(text: string): Promise<TranslationResponse> {
    const apiKey = process.env.OPENAI_API_KEY;
    const baseUrl = process.env.OPENAI_BASE_URL;
    const model = process.env.OPENAI_MODEL || 'gemini-2.5-flash-lite-nothinking';

    if (!apiKey || !baseUrl) {
        throw new Error('Missing OPENAI_API_KEY or OPENAI_BASE_URL');
    }

    const systemPrompt = `You are a professional translator. Translate the following Vietnamese text into English (en), Japanese (ja), French (fr), Korean (ko), and Chinese Simplified (zh).
    Return ONLY a valid JSON object with keys: en, ja, fr, ko, zh. Do not add any markdown formatting or extra text.`;

    try {
        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    {
                        role: 'user',
                        content: text
                    }
                ],
                temperature: 0.1,
                top_p: 1,
                stream: false
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Translation failed');
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content;

        if (!content) {
            throw new Error('No content received from translation API');
        }

        // Clean up markdown code blocks if present
        const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim();

        return JSON.parse(jsonStr);
    } catch (error) {
        console.error('Translation error:', error);
        throw error;
    }
}
