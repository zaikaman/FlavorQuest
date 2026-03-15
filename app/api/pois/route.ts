import { createServerClient, getCurrentUserProfile, isUserAdmin } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_POI_SELECT = `
    id,
    lat,
    lng,
    radius,
    priority,
    name_vi,
    name_en,
    name_ja,
    name_fr,
    name_ko,
    name_zh,
    description_vi,
    description_en,
    description_ja,
    description_fr,
    description_ko,
    description_zh,
    audio_url_vi,
    audio_url_en,
    audio_url_ja,
    audio_url_fr,
    audio_url_ko,
    audio_url_zh,
    image_url,
    signature_dish,
    fun_fact,
    estimated_hours,
    owner_id,
    created_at,
    updated_at
`.replace(/\s+/g, ' ').trim();

/**
 * GET /api/pois
 * Fetch all POIs (public)
 */
export async function GET(request: NextRequest) {
    const supabase = await createServerClient();
    const searchParams = request.nextUrl.searchParams;
    const includeDeleted = searchParams.get('include_deleted') === 'true';
    const ownerOnly = searchParams.get('owner_only') === 'true';

    const profile = ownerOnly ? await getCurrentUserProfile(supabase) : null;

    if (ownerOnly && !profile) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const selectFields = ownerOnly || includeDeleted ? '*' : PUBLIC_POI_SELECT;
    let query = supabase
        .from('pois')
        .select(selectFields)
        .order('priority', { ascending: false });

    if (ownerOnly) {
        query = query.eq('owner_id', profile!.id);
    }

    if (!includeDeleted) {
        query = query.is('deleted_at', null);
    }

    const { data, error } = await query;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}

/**
 * POST /api/pois
 * Create new POI (admin only)
 */
export async function POST(request: NextRequest) {
    const supabase = await createServerClient();
    const isAdmin = await isUserAdmin(supabase);

    if (!isAdmin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const body = await request.json();

        // Validate required fields (basic validation)
        if (!body.name_vi || !body.lat || !body.lng) {
            return NextResponse.json(
                { error: 'Missing required fields: name_vi, lat, lng' },
                { status: 400 }
            );
        }

        const { data, error } = await supabase
            .from('pois')
            .insert(body)
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data, { status: 201 });
    } catch {
        return NextResponse.json(
            { error: 'Invalid request body' },
            { status: 400 }
        );
    }
}
