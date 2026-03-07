import { createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE_HEADERS });
  }

  const adminEmails = (process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean);

  if (user.email && adminEmails.includes(user.email.toLowerCase())) {
    return NextResponse.json(
      { id: user.id, email: user.email, role: 'admin', customerAccessGranted: true, customerAccessGrantedAt: null },
      { headers: NO_STORE_HEADERS }
    );
  }

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from('users')
    .select('role, customer_access_granted, customer_access_granted_at')
    .eq('id', user.id)
    .single();

  if (error) {
    return NextResponse.json(
      {
        id: user.id,
        email: user.email,
        role: 'customer',
        customerAccessGranted: false,
        customerAccessGrantedAt: null,
        warning: error.message,
      },
      { headers: NO_STORE_HEADERS }
    );
  }

  const resolvedRole = data?.role === 'owner' ? 'owner' : 'customer';

  return NextResponse.json(
    {
      id: user.id,
      email: user.email,
      role: resolvedRole,
      customerAccessGranted: resolvedRole === 'customer' ? data?.customer_access_granted ?? false : true,
      customerAccessGrantedAt: data?.customer_access_granted_at ?? null,
    },
    { headers: NO_STORE_HEADERS }
  );
}
