import { createServerClient, isUserAdmin } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { translateText, translateTexts } from '@/lib/services/translator';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const isAdmin = await isUserAdmin(supabase);

    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { text, texts } = body as {
      text?: string;
      texts?: Record<string, string>;
    };

    if (texts && typeof texts === 'object') {
      const validTexts = Object.fromEntries(
        Object.entries(texts).filter(
          ([, value]) => typeof value === 'string' && value.trim().length > 0
        )
      );

      if (Object.keys(validTexts).length === 0) {
        return NextResponse.json({ error: 'Missing required field: texts' }, { status: 400 });
      }

      const translations = await translateTexts(validTexts);
      return NextResponse.json({ translations });
    }

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Missing required field: text' }, { status: 400 });
    }

    const translations = await translateText(text);

    return NextResponse.json(translations);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to translate text';
    console.error('Translation error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
