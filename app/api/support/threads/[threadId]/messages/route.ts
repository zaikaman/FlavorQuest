import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient, getCurrentUserProfile } from '@/lib/supabase/server';
import { getSupportMessages, sendSupportMessage } from '@/lib/server/support-chat';

interface RouteContext {
  params: Promise<{
    threadId: string;
  }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const supabase = await createServerClient();
  const profile = await getCurrentUserProfile(supabase);

  if (!profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { threadId } = await context.params;

  try {
    const result = await getSupportMessages(profile, threadId);

    if (!result) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Không thể tải tin nhắn.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const supabase = await createServerClient();
  const profile = await getCurrentUserProfile(supabase);

  if (!profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { threadId } = await context.params;

  try {
    const body = (await request.json()) as { content?: string };
    const content = body.content?.trim() ?? '';

    if (!content) {
      return NextResponse.json({ error: 'Tin nhắn không được để trống.' }, { status: 400 });
    }

    const message = await sendSupportMessage(profile, threadId, content);

    if (!message) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'EMPTY_MESSAGE') {
      return NextResponse.json({ error: 'Tin nhắn không được để trống.' }, { status: 400 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Không thể gửi tin nhắn.' },
      { status: 500 }
    );
  }
}
