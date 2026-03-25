import {
  NON_DEFAULT_LANGUAGE_CODES,
  SUPPORTED_LANGUAGE_CODES,
  getLocalizedFieldName,
} from '@/lib/constants';
import { normalizePOICategoryTags } from '@/lib/constants/poiCategories';
import { createServerClient, getCurrentUserProfile, isUserAdmin } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const LOCALIZED_POI_SELECT_FIELDS = [
  ...SUPPORTED_LANGUAGE_CODES.map((language) => getLocalizedFieldName('name', language)),
  ...SUPPORTED_LANGUAGE_CODES.map((language) => getLocalizedFieldName('description', language)),
  ...SUPPORTED_LANGUAGE_CODES.map((language) => getLocalizedFieldName('audio_url', language)),
];

const PUBLIC_POI_SELECT = [
  'id',
  'lat',
  'lng',
  'radius',
  ...LOCALIZED_POI_SELECT_FIELDS,
  'image_url',
  'signature_dish',
  'category_tags',
  'fun_fact',
  'estimated_hours',
  'owner_id',
  'created_at',
  'updated_at',
]
  .join(', ')
  .trim();

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

  const payload: Record<string, unknown> = {
    lat,
    lng,
    name_vi: nameVi,
    description_vi: normalizeOptionalText(rawBody.description_vi),
    audio_url_vi: normalizeOptionalText(rawBody.audio_url_vi),
    image_url: normalizeOptionalText(rawBody.image_url),
    signature_dish: normalizeOptionalText(rawBody.signature_dish),
    fun_fact: normalizeOptionalText(rawBody.fun_fact),
    estimated_hours: normalizeOptionalText(rawBody.estimated_hours),
    owner_id: normalizeOptionalText(rawBody.owner_id),
    category_tags: normalizePOICategoryTags(rawBody.category_tags),
    ...(radius !== null ? { radius } : {}),
  };

  for (const language of NON_DEFAULT_LANGUAGE_CODES) {
    const nameField = getLocalizedFieldName('name', language);
    const descriptionField = getLocalizedFieldName('description', language);
    const audioField = getLocalizedFieldName('audio_url', language);

    payload[nameField] =
      language === 'en'
        ? (normalizeOptionalText(rawBody[nameField]) ?? nameVi)
        : normalizeOptionalText(rawBody[nameField]);
    payload[descriptionField] = normalizeOptionalText(rawBody[descriptionField]);
    payload[audioField] = normalizeOptionalText(rawBody[audioField]);
  }

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
  let query = supabase.from('pois').select(selectFields).order('name_vi', { ascending: true });

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

    if (!payload.name_vi || payload.lat === null || payload.lng === null) {
      return NextResponse.json(
        { error: 'Missing required fields: name_vi, lat, lng' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.from('pois').insert(payload).select().single();

    if (error) {
      console.error('POI create failed:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
