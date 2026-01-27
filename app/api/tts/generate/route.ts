import { createServerClient, isUserAdmin } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { generateTTSAudio, getRecommendedVoice } from '@/lib/services/tts-generator';

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
        const { text, languageCode, poiId, fieldName } = body;

        if (!text || !languageCode) {
            return NextResponse.json(
                { error: 'Missing required fields: text, languageCode' },
                { status: 400 }
            );
        }

        // Generate audio buffer
        const audioBuffer = await generateTTSAudio({
            text,
            languageCode,
            name: getRecommendedVoice(languageCode.split('-')[0]), // 'vi', 'en', etc.
        });

        // Use Admin Client for storage operations to bypass RLS
        const adminSupabase = createAdminClient();

        // Upload to Supabase Storage
        const fileName = `${poiId || 'temp'}/${fieldName || 'audio'}-${crypto.randomUUID()}.mp3`;
        const bucketName = 'audio';

        const { error: uploadError } = await adminSupabase.storage
            .from(bucketName)
            .upload(fileName, audioBuffer, {
                contentType: 'audio/mpeg',
                upsert: true,
            });

        if (uploadError) {
            console.error('Storage upload error:', uploadError);
            return NextResponse.json({ error: 'Failed to upload audio file' }, { status: 500 });
        }

        // Get public URL using regular client (read is public)
        const { data: { publicUrl } } = supabase.storage
            .from(bucketName)
            .getPublicUrl(fileName);

        return NextResponse.json({ url: publicUrl, fileName });
    } catch (error: any) {
        console.error('TTS Generation error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to generate audio' },
            { status: 500 }
        );
    }
}
