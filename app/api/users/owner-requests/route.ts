import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { listPendingOwnerRequests, reviewOwnerRequest } from '@/lib/server/owner-requests';
import { createServerClient, getCurrentUserProfile } from '@/lib/supabase/server';
import type { ReviewOwnerRequestPayload } from '@/lib/types';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

export async function GET() {
  const supabase = await createServerClient();
  const profile = await getCurrentUserProfile(supabase);

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: NO_STORE_HEADERS });
  }

  try {
    const data = await listPendingOwnerRequests();
    return NextResponse.json(data, { headers: NO_STORE_HEADERS });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Không thể tải danh sách yêu cầu owner.',
      },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const supabase = await createServerClient();
  const profile = await getCurrentUserProfile(supabase);

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: NO_STORE_HEADERS });
  }

  try {
    const body = (await request.json()) as Partial<ReviewOwnerRequestPayload>;

    if (
      !body.userId ||
      !body.decision ||
      (body.decision !== 'approve' && body.decision !== 'reject')
    ) {
      return NextResponse.json(
        { error: 'Invalid userId or decision' },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const updated = await reviewOwnerRequest({
      userId: body.userId,
      reviewerId: profile.id,
      decision: body.decision,
    });

    return NextResponse.json(updated, { headers: NO_STORE_HEADERS });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'OWNER_REQUEST_NOT_FOUND') {
        return NextResponse.json(
          { error: 'Không tìm thấy yêu cầu owner.' },
          { status: 404, headers: NO_STORE_HEADERS }
        );
      }

      if (error.message === 'OWNER_REQUEST_NOT_PENDING') {
        return NextResponse.json(
          { error: 'Yêu cầu này không còn ở trạng thái chờ duyệt.' },
          { status: 409, headers: NO_STORE_HEADERS }
        );
      }

      if (error.message === 'INVALID_OWNER_REQUEST_TARGET') {
        return NextResponse.json(
          { error: 'Không thể duyệt tài khoản admin qua luồng này.' },
          { status: 400, headers: NO_STORE_HEADERS }
        );
      }
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Không thể cập nhật yêu cầu owner.',
      },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
