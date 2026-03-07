import { createServerClient, isUserAdmin } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

export async function GET() {
  const supabase = await createServerClient();
  const isAdmin = await isUserAdmin(supabase);

  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: NO_STORE_HEADERS });
  }

  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from('users')
    .select('id, email, role')
    .eq('role', 'owner')
    .order('email', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: NO_STORE_HEADERS });
  }

  return NextResponse.json(data ?? [], { headers: NO_STORE_HEADERS });
}
