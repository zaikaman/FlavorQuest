import { createServerClient, getCurrentUserProfile, isUserAdmin } from '@/lib/supabase/server';
import { normalizePOICategoryTags } from '@/lib/constants/poiCategories';
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
    category_tags,
    fun_fact,
    estimated_hours,
    owner_id,
    created_at,
    updated_at
`.replace(/\s+/g, ' ').trim();

function normalizeRequiredText(value: unknown) {
    return typeof value === 'string' ? value.trim() : '';
}

function normalizeOptionalText(value: unknown) {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim();
    return trimmed ? trimmed : null;
}

function normalizeFiniteNumber(value: unknown) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();

        if (!trimmed) {
            return null;
        }

        const parsed = Number(trimmed);
        return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
}

function buildPOIInsertPayload(rawBody: Record<string, unknown>) {
    const nameVi = normalizeRequiredText(rawBody.name_vi);
    const lat = normalizeFiniteNumber(rawBody.lat);
    const lng = normalizeFiniteNumber(rawBody.lng);
    const radius = normalizeFiniteNumber(rawBody.radius);
    const priority = normalizeFiniteNumber(rawBody.priority);

    const payload = {
        lat,
        lng,
        name_vi: nameVi,
        name_en: normalizeOptionalText(rawBody.name_en) ?? nameVi,
        name_ja: normalizeOptionalText(rawBody.name_ja),
        name_fr: normalizeOptionalText(rawBody.name_fr),
        name_ko: normalizeOptionalText(rawBody.name_ko),
        name_zh: normalizeOptionalText(rawBody.name_zh),
        description_vi: normalizeOptionalText(rawBody.description_vi),
        description_en: normalizeOptionalText(rawBody.description_en),
        description_ja: normalizeOptionalText(rawBody.description_ja),
        description_fr: normalizeOptionalText(rawBody.description_fr),
        description_ko: normalizeOptionalText(rawBody.description_ko),
        description_zh: normalizeOptionalText(rawBody.description_zh),
        audio_url_vi: normalizeOptionalText(rawBody.audio_url_vi),
        audio_url_en: normalizeOptionalText(rawBody.audio_url_en),
        audio_url_ja: normalizeOptionalText(rawBody.audio_url_ja),
        audio_url_fr: normalizeOptionalText(rawBody.audio_url_fr),
        audio_url_ko: normalizeOptionalText(rawBody.audio_url_ko),
        audio_url_zh: normalizeOptionalText(rawBody.audio_url_zh),
        image_url: normalizeOptionalText(rawBody.image_url),
        signature_dish: normalizeOptionalText(rawBody.signature_dish),
        fun_fact: normalizeOptionalText(rawBody.fun_fact),
        estimated_hours: normalizeOptionalText(rawBody.estimated_hours),
        owner_id: normalizeOptionalText(rawBody.owner_id),
        category_tags: normalizePOICategoryTags(rawBody.category_tags),
        ...(radius !== null ? { radius } : {}),
        ...(priority !== null ? { priority } : {}),
    };

    return payload;
}

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
        const body = (await request.json()) as Record<string, unknown>;
        const payload = buildPOIInsertPayload(body);

        // Validate required fields (basic validation)
        if (
            !payload.name_vi ||
            payload.lat === null ||
            payload.lng === null
        ) {
            return NextResponse.json(
                { error: 'Missing required fields: name_vi, lat, lng' },
                { status: 400 }
            );
        }

        const { data, error } = await supabase
            .from('pois')
            .insert(payload)
            .select()
            .single();

        if (error) {
            console.error('POI create failed:', error);
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
