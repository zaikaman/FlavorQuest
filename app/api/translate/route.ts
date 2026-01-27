
import { createServerClient, isUserAdmin } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { translateText } from '@/lib/services/translator';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createServerClient();
        const isAdmin = await isUserAdmin(supabase);

        if (!isAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await request.json();
        const { text } = body;

        if (!text) {
            return NextResponse.json(
                { error: 'Missing required field: text' },
                { status: 400 }
            );
        }

        const translations = await translateText(text);

        return NextResponse.json(translations);
    } catch (error: any) {
        console.error('Translation error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to translate text' },
            { status: 500 }
        );
    }
}
