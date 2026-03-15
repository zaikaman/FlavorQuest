import { NextResponse } from 'next/server';
import { createServerClient, getCurrentUserProfile } from '@/lib/supabase/server';
import { markThreadRead } from '@/lib/server/support-chat';

interface RouteContext {
  params: Promise<{
    threadId: string;
  }>;
}

export async function POST(_request: Request, context: RouteContext) {
  const supabase = await createServerClient();
  const profile = await getCurrentUserProfile(supabase);

  if (!profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { threadId } = await context.params;

  try {
    const success = await markThreadRead(profile, threadId);

    if (!success) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Không thể cập nhật trạng thái đã đọc.' },
      { status: 500 }
    );
  }
}
