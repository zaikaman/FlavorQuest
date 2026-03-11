import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerClient } from '@/lib/supabase/server';

type AccountType = 'customer' | 'owner';

export async function POST(request: NextRequest) {
  let accountType: AccountType = 'customer';

  try {
    const body = await request.json();
    accountType = body?.accountType === 'owner' ? 'owner' : 'customer';
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

  const desiredRole = accountType === 'owner' ? 'owner' : 'customer';
  const { data: existingProfile, error: existingProfileError } = await adminClient
    .from('users')
    .select('role')
    .eq('id', currentUser.id)
    .maybeSingle();

  if (existingProfileError) {
    return NextResponse.json({ error: existingProfileError.message }, { status: 500 });
  }

  const timestamp = new Date().toISOString();
  const isExistingAdmin = existingProfile?.role === 'admin';

  const { error: upsertError } = isExistingAdmin
    ? await adminClient
        .from('users')
        .upsert(
          {
            id: currentUser.id,
            email: currentUser.email,
            updated_at: timestamp,
          },
          { onConflict: 'id' }
        )
    : await adminClient
        .from('users')
        .upsert(
          {
            id: currentUser.id,
            email: currentUser.email,
            role: desiredRole,
            updated_at: timestamp,
          },
          { onConflict: 'id' }
        );

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  const { data: profile } = await adminClient
    .from('users')
    .select('customer_access_granted')
    .eq('id', currentUser.id)
    .maybeSingle();

  const redirectTo = isExistingAdmin
    ? '/admin'
    : desiredRole === 'owner'
      ? '/owner'
      : profile?.customer_access_granted
        ? '/tour'
        : '/paywall';

  return NextResponse.json({ redirectTo, role: isExistingAdmin ? 'admin' : desiredRole });
}