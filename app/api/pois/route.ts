import { createServerClient, isUserAdmin } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * GET /api/pois
 * Fetch all POIs (public)
 */
export async function GET(request: NextRequest) {
    const supabase = await createServerClient();
    const searchParams = request.nextUrl.searchParams;
    const includeDeleted = searchParams.get('include_deleted') === 'true';

    let query = supabase
        .from('pois')
        .select('*')
        .order('priority', { ascending: false });

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
    } catch (error) {
        return NextResponse.json(
            { error: 'Invalid request body' },
            { status: 400 }
        );
    }
}
