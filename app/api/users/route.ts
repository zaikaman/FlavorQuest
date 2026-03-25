import { createServerClient, isUserAdmin } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

type EditableRole = 'customer' | 'pending-owner' | 'owner' | 'admin';

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
    .select('id, email, role, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: NO_STORE_HEADERS });
  }

  return NextResponse.json(data ?? [], { headers: NO_STORE_HEADERS });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createServerClient();
  const isAdmin = await isUserAdmin(supabase);

  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: NO_STORE_HEADERS });
  }

  try {
    const body = await request.json();
    const role = body.role as EditableRole;
    const userId = body.userId as string;

    const adminClient = createAdminClient();

    if (!userId || !role || !['customer', 'pending-owner', 'owner', 'admin'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid userId or role' },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const { data, error } = await adminClient
      .from('users')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select('id, email, role')
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: NO_STORE_HEADERS }
      );
    }

    return NextResponse.json(data, { headers: NO_STORE_HEADERS });
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }
}
