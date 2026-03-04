import { createServerClient, getCurrentUserProfile } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

async function canManageDish(dishId: string) {
  const supabase = await createServerClient();
  const profile = await getCurrentUserProfile(supabase);

  if (!profile) {
    return { allowed: false as const, supabase, profile: null, dish: null };
  }

  const { data: dish, error: dishError } = await supabase
    .from('dishes')
    .select('id, poi_id')
    .eq('id', dishId)
    .single();

  if (dishError || !dish) {
    return { allowed: false as const, supabase, profile, dish: null };
  }

  if (profile.role === 'admin') {
    return { allowed: true as const, supabase, profile, dish };
  }

  const { data: poi } = await supabase
    .from('pois')
    .select('owner_id')
    .eq('id', dish.poi_id)
    .single();

  const allowed = poi?.owner_id === profile.id;
  return { allowed, supabase, profile, dish };
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const access = await canManageDish(id);

  if (!access.profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!access.allowed || !access.dish) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();

    const payload = {
      name: body.name,
      description: body.description,
      price: body.price,
      is_available: body.is_available,
      image_url: body.image_url,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await access.supabase
      .from('dishes')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const access = await canManageDish(id);

  if (!access.profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!access.allowed || !access.dish) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await access.supabase
    .from('dishes')
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
