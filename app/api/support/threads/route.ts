import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient, getCurrentUserProfile } from '@/lib/supabase/server';
import { createSupportThread, listSupportThreads } from '@/lib/server/support-chat';

function mapThreadCreationError(error: unknown) {
  if (!(error instanceof Error)) {
    return { message: 'Không thể khởi tạo cuộc trò chuyện.', status: 500 };
  }

  if (error.message === 'INVALID_THREAD_TYPE') {
    return { message: 'Loại cuộc trò chuyện không hợp lệ.', status: 400 };
  }

  if (error.message === 'OWNER_NOT_ASSIGNED') {
    return { message: 'Điểm bán này chưa có chủ quán phụ trách.', status: 400 };
  }

  return { message: error.message, status: 500 };
}

export async function GET() {
  const supabase = await createServerClient();
  const profile = await getCurrentUserProfile(supabase);

  if (!profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await listSupportThreads(profile);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Không thể tải danh sách chat.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const profile = await getCurrentUserProfile(supabase);

  if (!profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { threadType?: string; poiId?: string };
    const threadId = await createSupportThread(profile, {
      threadType: (body.threadType as 'customer_owner' | 'customer_admin' | 'owner_admin') ?? 'customer_admin',
      poiId: body.poiId,
    });

    return NextResponse.json({ threadId }, { status: 201 });
  } catch (error) {
    const mappedError = mapThreadCreationError(error);
    return NextResponse.json({ error: mappedError.message }, { status: mappedError.status });
  }
}
