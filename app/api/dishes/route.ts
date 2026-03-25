import { createServerClient, getCurrentUserProfile } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const DISH_SELECT_FIELDS = `
  id,
  poi_id,
  name,
  description,
  price,
  is_available,
  image_url,
  created_at,
  updated_at
`
  .replace(/\s+/g, ' ')
  .trim();

export async function GET(request: NextRequest) {
  const supabase = await createServerClient();
  const poiId = request.nextUrl.searchParams.get('poi_id');

  if (!poiId) {
    return NextResponse.json({ error: 'Missing poi_id' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('dishes')
    .select(DISH_SELECT_FIELDS)
    .eq('poi_id', poiId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const profile = await getCurrentUserProfile(supabase);

  if (!profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    if (!body.poi_id || !body.name || body.price === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: poi_id, name, price' },
        { status: 400 }
      );
    }

    const { data: poi, error: poiError } = await supabase
      .from('pois')
      .select('id, owner_id')
      .eq('id', body.poi_id)
      .single();

    if (poiError || !poi) {
      return NextResponse.json({ error: 'POI not found' }, { status: 404 });
    }

    const canManage = profile.role === 'admin' || poi.owner_id === profile.id;
    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const payload = {
      poi_id: body.poi_id,
      name: body.name,
      description: body.description ?? null,
      price: body.price,
      is_available: body.is_available ?? true,
      image_url: body.image_url ?? null,
    };

    const { data, error } = await supabase
      .from('dishes')
      .insert(payload)
      .select(DISH_SELECT_FIELDS)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
