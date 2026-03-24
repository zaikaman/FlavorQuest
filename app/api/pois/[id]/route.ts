import { createServerClient, getCurrentUserProfile } from '@/lib/supabase/server';
import { normalizePOICategoryTags } from '@/lib/constants/poiCategories';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * GET /api/pois/[id]
 * Fetch single POI
 */
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const supabase = await createServerClient();

    const { data, error } = await supabase
        .from('pois')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(data);
}

/**
 * PUT /api/pois/[id]
 * Update POI (admin only)
 */
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const supabase = await createServerClient();
    const profile = await getCurrentUserProfile(supabase);

    if (!profile) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const body = await request.json();

        if (Object.prototype.hasOwnProperty.call(body, 'category_tags')) {
            body.category_tags = normalizePOICategoryTags(body.category_tags);
        }

        const { data: poi, error: poiError } = await supabase
            .from('pois')
            .select('id, owner_id')
            .eq('id', id)
            .single();

        if (poiError || !poi) {
            return NextResponse.json({ error: 'POI not found' }, { status: 404 });
        }

        const canEdit = profile.role === 'admin' || poi.owner_id === profile.id;
        if (!canEdit) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Prevent updating id or created_at
        delete body.id;
        delete body.created_at;

        if (profile.role !== 'admin') {
            delete body.lat;
            delete body.lng;
            delete body.radius;
            delete body.deleted_at;
            delete body.owner_id;
            delete body.category_tags;
        }

        // Update timestamp
        body.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from('pois')
            .update(body)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch {
        return NextResponse.json(
            { error: 'Invalid request body' },
            { status: 400 }
        );
    }
}

/**
 * DELETE /api/pois/[id]
 * Soft delete POI (admin only)
 */
export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const supabase = await createServerClient();
    const profile = await getCurrentUserProfile(supabase);

    if (!profile || profile.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Soft delete by setting deleted_at
    const { error } = await supabase
        .from('pois')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
