import { createServerClient, isUserAdmin } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

type EditableRole = 'customer' | 'owner';

export async function GET() {
  const supabase = await createServerClient();
  const isAdmin = await isUserAdmin(supabase);

  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('users')
    .select('id, email, role, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function PATCH(request: NextRequest) {
  const supabase = await createServerClient();
  const isAdmin = await isUserAdmin(supabase);

  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const role = body.role as EditableRole;
    const userId = body.userId as string;

    if (!userId || !role || !['customer', 'owner'].includes(role)) {
      return NextResponse.json({ error: 'Invalid userId or role' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('users')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select('id, email, role')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
