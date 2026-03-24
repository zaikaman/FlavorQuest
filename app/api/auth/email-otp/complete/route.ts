import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ensureOwnerRequestForUser } from '@/lib/server/owner-requests';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerClient } from '@/lib/supabase/server';

type AccountType = 'customer' | 'owner' | 'admin';

export async function POST(request: NextRequest) {
  let accountType: AccountType = 'customer';

  try {
    const body = await request.json();

    if (body?.accountType === 'owner') {
      accountType = 'owner';
    } else if (body?.accountType === 'admin') {
      accountType = 'admin';
    }
  } catch {
    accountType = 'customer';
  }

  const adminClient = createAdminClient();
  const authHeader = request.headers.get('authorization');
  let currentUser: { id: string; email: string | null } | null = null;

  if (authHeader?.startsWith('Bearer ')) {
    const accessToken = authHeader.slice('Bearer '.length).trim();

    if (accessToken) {
      const {
        data: { user },
        error,
      } = await adminClient.auth.getUser(accessToken);

      if (!error && user?.id) {
        currentUser = { id: user.id, email: user.email ?? null };
      }
    }
  }

  if (!currentUser) {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.id) {
      currentUser = { id: user.id, email: user.email ?? null };
    }
  }

  if (!currentUser?.id || !currentUser.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: existingProfile, error: existingProfileError } = await adminClient
    .from('users')
    .select('role, owner_request_status')
    .eq('id', currentUser.id)
    .maybeSingle();

  if (existingProfileError) {
    return NextResponse.json({ error: existingProfileError.message }, { status: 500 });
  }

  const existingRole = existingProfile?.role ?? null;
  const isExistingAdmin = existingRole === 'admin';

  if (accountType === 'admin' && !isExistingAdmin) {
    return NextResponse.json(
      {
        error: 'Email nay khong co quyen quan tri.',
        errorCode: 'ADMIN_ONLY_PORTAL',
      },
      { status: 403 }
    );
  }

  if (accountType !== 'admin' && isExistingAdmin) {
    return NextResponse.json(
      {
        error: 'Tai khoan quan tri phai dang nhap tu cong admin rieng.',
        errorCode: 'ADMIN_PORTAL_REQUIRED',
      },
      { status: 403 }
    );
  }

  const timestamp = new Date().toISOString();

  if (existingRole === 'owner') {
    return NextResponse.json({
      redirectTo: '/owner',
      role: 'owner',
      ownerRequestStatus: existingProfile?.owner_request_status ?? null,
    });
  }

  if (existingRole === 'pending-owner') {
    return NextResponse.json({
      redirectTo: '/pending-owner',
      role: 'pending-owner',
      ownerRequestStatus: existingProfile?.owner_request_status ?? null,
    });
  }

  if (accountType === 'admin') {
    const { error: upsertError } = await adminClient.from('users').upsert(
      {
        id: currentUser.id,
        email: currentUser.email,
        updated_at: timestamp,
      },
      { onConflict: 'id' }
    );

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({ redirectTo: '/admin', role: 'admin' });
  }

  if (accountType === 'owner') {
    try {
      const result = await ensureOwnerRequestForUser({
        id: currentUser.id,
        email: currentUser.email,
      });

      return NextResponse.json(result);
    } catch (error) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : 'Không thể tạo yêu cầu owner lúc này.',
        },
        { status: 500 }
      );
    }
  }

  const { error: upsertError } = await adminClient.from('users').upsert(
    {
      id: currentUser.id,
      email: currentUser.email,
      role: 'customer',
      updated_at: timestamp,
    },
    { onConflict: 'id' }
  );

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  const { data: profile } = await adminClient
    .from('users')
    .select('owner_request_status')
    .eq('id', currentUser.id)
    .maybeSingle();

  return NextResponse.json({
    redirectTo: '/tour',
    role: 'customer',
    ownerRequestStatus: profile?.owner_request_status ?? null,
  });
}
