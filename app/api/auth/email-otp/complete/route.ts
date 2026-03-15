import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
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
    .select('role')
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

  const desiredRole = accountType === 'owner' ? 'owner' : accountType === 'admin' ? 'admin' : 'customer';
  const timestamp = new Date().toISOString();
  const upsertPayload =
    accountType === 'admin'
      ? {
          id: currentUser.id,
          email: currentUser.email,
          updated_at: timestamp,
        }
      : {
          id: currentUser.id,
          email: currentUser.email,
          role: desiredRole,
          updated_at: timestamp,
        };

  const { error: upsertError } = await adminClient
    .from('users')
    .upsert(upsertPayload, { onConflict: 'id' });

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  if (accountType === 'admin') {
    return NextResponse.json({ redirectTo: '/admin', role: 'admin' });
  }

  const { data: profile } = await adminClient
    .from('users')
    .select('customer_access_granted')
    .eq('id', currentUser.id)
    .maybeSingle();

  const redirectTo =
    desiredRole === 'owner' ? '/owner' : profile?.customer_access_granted ? '/tour' : '/paywall';

  return NextResponse.json({ redirectTo, role: desiredRole });
}
