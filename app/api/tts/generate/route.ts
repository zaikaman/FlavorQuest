import { createServerClient, isUserAdmin } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createHash } from 'node:crypto';
import { generateTTSAudio, getRecommendedVoice } from '@/lib/services/tts-generator';
import { runWithConcurrency } from '@/lib/utils/async';

const TTS_BATCH_CONCURRENCY = 3;
const TTS_BUCKET_NAME = 'audio';
const ttsInFlightCache = new Map<
  string,
  Promise<{ url: string; fileName: string; cached: boolean }>
>();

interface TTSGenerateRequestItem {
  text: string;
  languageCode: string;
  poiId?: string;
  fieldName?: string;
}

function sanitizePathSegment(value: string | undefined, fallback: string) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return fallback;
  }

  return trimmed.replace(/[^a-zA-Z0-9-_]/g, '-');
}

function buildAudioFileName({ text, languageCode, poiId, fieldName }: TTSGenerateRequestItem) {
  const directory = sanitizePathSegment(poiId, 'temp');
  const field = sanitizePathSegment(fieldName, 'audio');
  const voice = getRecommendedVoice(languageCode.split('-')[0] || languageCode);
  const contentHash = createHash('sha256')
    .update(`${languageCode}:${voice}:${text.trim()}`)
    .digest('hex')
    .slice(0, 16);

  return `${directory}/${field}-${contentHash}.mp3`;
}

async function resolvePublicAudioUrl(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  fileName: string
) {
  const {
    data: { publicUrl },
  } = supabase.storage.from(TTS_BUCKET_NAME).getPublicUrl(fileName);

  return publicUrl;
}

async function findExistingAudioUrl(
  adminSupabase: ReturnType<typeof createAdminClient>,
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  fileName: string
) {
  const [directory, file] = fileName.split(/\/(.+)/, 2);

  if (!directory || !file) {
    return null;
  }

  const { data, error } = await adminSupabase.storage
    .from(TTS_BUCKET_NAME)
    .list(directory, { search: file, limit: 1 });

  if (error) {
    console.error('Storage list error:', error);
    return null;
  }

  const exists = data?.some((entry) => entry.name === file);
  if (!exists) {
    return null;
  }

  return resolvePublicAudioUrl(supabase, fileName);
}

async function generateAndStoreAudio(
  item: TTSGenerateRequestItem,
  adminSupabase: ReturnType<typeof createAdminClient>,
  supabase: Awaited<ReturnType<typeof createServerClient>>
) {
  const normalizedText = item.text.trim();
  const normalizedLanguageCode = item.languageCode.trim();
  const voice = getRecommendedVoice(normalizedLanguageCode.split('-')[0] || normalizedLanguageCode);
  const fileName = buildAudioFileName({
    ...item,
    text: normalizedText,
    languageCode: normalizedLanguageCode,
  });
  const cacheKey = `${normalizedLanguageCode}:${fileName}`;

  const cachedRequest = ttsInFlightCache.get(cacheKey);
  if (cachedRequest) {
    return cachedRequest;
  }

  const requestPromise = (async () => {
    const existingUrl = await findExistingAudioUrl(adminSupabase, supabase, fileName);
    if (existingUrl) {
      return { url: existingUrl, fileName, cached: true };
    }

    const audioBuffer = await generateTTSAudio({
      text: normalizedText,
      languageCode: normalizedLanguageCode,
      name: voice,
    });

    const { error: uploadError } = await adminSupabase.storage
      .from(TTS_BUCKET_NAME)
      .upload(fileName, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: false,
      });

    if (uploadError) {
      const retryUrl = await findExistingAudioUrl(adminSupabase, supabase, fileName);
      if (retryUrl) {
        return { url: retryUrl, fileName, cached: true };
      }

      console.error('Storage upload error:', uploadError);
      throw new Error('Failed to upload audio file');
    }

    const publicUrl = await resolvePublicAudioUrl(supabase, fileName);
    return { url: publicUrl, fileName, cached: false };
  })().finally(() => {
    ttsInFlightCache.delete(cacheKey);
  });

  ttsInFlightCache.set(cacheKey, requestPromise);
  return requestPromise;
}

/**
 * POST /api/tts/generate
 * Generate audio from text (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const isAdmin = await isUserAdmin(supabase);

    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const adminSupabase = createAdminClient();
    const { text, languageCode, poiId, fieldName, items } = body as TTSGenerateRequestItem & {
      items?: TTSGenerateRequestItem[];
    };

    if (Array.isArray(items)) {
      const validItems = items.filter(
        (item) =>
          typeof item?.text === 'string' &&
          item.text.trim().length > 0 &&
          typeof item?.languageCode === 'string' &&
          item.languageCode.trim().length > 0
      );

      if (validItems.length === 0) {
        return NextResponse.json(
          { error: 'Missing required fields in items: text, languageCode' },
          { status: 400 }
        );
      }

      const taskFactories = validItems.map((item) => async () => {
        try {
          const result = await generateAndStoreAudio(item, adminSupabase, supabase);
          return {
            languageCode: item.languageCode,
            fieldName: item.fieldName,
            ...result,
          };
        } catch (error) {
          return {
            languageCode: item.languageCode,
            fieldName: item.fieldName,
            error: error instanceof Error ? error.message : 'Failed to generate audio',
          };
        }
      });

      const results = await runWithConcurrency(taskFactories, TTS_BATCH_CONCURRENCY);
      return NextResponse.json({
        items: results.filter((item) => !('error' in item)),
        errors: results.filter((item) => 'error' in item),
      });
    }

    if (!text || !languageCode) {
      return NextResponse.json(
        { error: 'Missing required fields: text, languageCode' },
        { status: 400 }
      );
    }

    const result = await generateAndStoreAudio(
      { text, languageCode, poiId, fieldName },
      adminSupabase,
      supabase
    );

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate audio';
    console.error('TTS Generation error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
