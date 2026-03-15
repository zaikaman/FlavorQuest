import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

type AccountType = 'customer' | 'owner' | 'admin';

export async function POST(request: NextRequest) {
  let email = '';
  let accountType: AccountType = 'customer';

  try {
    const body = await request.json();
    email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (body?.accountType === 'owner') {
      accountType = 'owner';
    } else if (body?.accountType === 'admin') {
      accountType = 'admin';
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const { data: existingProfile, error } = await adminClient
    .from('users')
    .select('role')
    .eq('email', email)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const existingRole = existingProfile?.role ?? null;

  if (accountType === 'admin' && existingRole !== 'admin') {
    return NextResponse.json(
      {
        error: 'Email nay khong co quyen quan tri.',
        errorCode: 'ADMIN_ONLY_PORTAL',
      },
      { status: 403 }
    );
  }

  if (accountType !== 'admin' && existingRole === 'admin') {
    return NextResponse.json(
      {
        error: 'Tai khoan quan tri phai dang nhap tu cong admin rieng.',
        errorCode: 'ADMIN_PORTAL_REQUIRED',
      },
      { status: 403 }
    );
  }

  return NextResponse.json({ ok: true });
}
