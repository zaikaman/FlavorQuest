/**
 * TTS Generator Service
 * Generate audio files from text using Azure OpenAI gpt-4o-mini-tts
 */

interface TTSRequest {
    text: string;
    languageCode: string; // Keep for compatibility, though OpenAI models are multilingual
    name?: string; // Voice name (alloy, echo, etc.)
}

/**
 * Generate audio content string (Buffer) from Azure OpenAI TTS
 */
export async function generateTTSAudio({ text, languageCode, name }: TTSRequest): Promise<Buffer> {
    const apiKey = process.env.AZURE_API_KEY;

    if (!apiKey) {
        throw new Error('Missing AZURE_API_KEY environment variable');
    }

    // Default to 'alloy' if no valid OpenAI voice is provided
    const voice = isValidOpenAIVoice(name) ? name : getRecommendedVoice(languageCode);

    // Endpoint structure: https://{resource}.cognitiveservices.azure.com/openai/deployments/{deployment}/audio/speech?api-version={version}
    // Resource: flavorquest-resource
    // Deployment: gpt-4o-mini-tts
    const url = 'https://flavorquest-resource.cognitiveservices.azure.com/openai/deployments/gpt-4o-mini-tts/audio/speech?api-version=2024-02-15-preview';

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'api-key': apiKey, // Azure uses 'api-key' header or Bearer token. User sample used "Authorization: Bearer". I'll stick to Bearer as per user sample.
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini-tts',
            input: text,
            voice: voice,
            response_format: 'mp3',
            speed: 1.0
        }),
    });

    if (!response.ok) {
        let errorMessage = 'Failed to generate TTS audio';
        try {
            const error = await response.json();
            errorMessage = error.error?.message || JSON.stringify(error);
        } catch (e) {
            errorMessage = await response.text();
        }
        throw new Error(`Azure TTS Error (${response.status}): ${errorMessage}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
}

const OPENAI_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];

function isValidOpenAIVoice(name?: string): boolean {
    return !!name && OPENAI_VOICES.includes(name);
}

/**
 * Get recommended voice for language
 * OpenAI voices are multilingual, so we map loosely to preferences or cycle them.
 */
export function getRecommendedVoice(language: string): string {
    switch (language) {
        case 'vi': return 'alloy';
        case 'en': return 'echo';
        case 'ja': return 'shimmer';
        case 'fr': return 'fable';
        case 'ko': return 'nova';
        case 'zh': return 'onyx';
        default: return 'alloy';
    }
}

export function getGoogleLanguageCode(language: string): string {
    // Kept for backward compatibility if needed, but really just returns the code
    return language;
}
