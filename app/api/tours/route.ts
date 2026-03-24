import { NON_DEFAULT_LANGUAGE_CODES, getLocalizedFieldName } from '@/lib/constants';
import { createServerClient, getCurrentUserProfile, isUserAdmin } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const TOUR_TEXT_FIELDS = [
  'name_vi',
  ...NON_DEFAULT_LANGUAGE_CODES.map((language) => getLocalizedFieldName('name', language)),
  'description_vi',
  ...NON_DEFAULT_LANGUAGE_CODES.map((language) => getLocalizedFieldName('description', language)),
  'cover_image_url',
] as const;

function toNullableText(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function sanitizePoiIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of value) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
  }

  return result;
}

async function validatePoiIds(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  poiIds: string[]
) {
  if (poiIds.length === 0) {
    return 'Tour phải có ít nhất 1 POI';
  }

  const { data, error } = await supabase.from('pois').select('id').in('id', poiIds).is('deleted_at', null);

  if (error) {
    return error.message;
  }

  if ((data ?? []).length !== poiIds.length) {
    return 'Danh sách POI có mục không hợp lệ hoặc đã bị xóa';
  }

  return null;
}

function buildPayload(body: Record<string, unknown>, poiIds: string[], createdBy?: string | null) {
  const payload: Record<string, unknown> = {
    poi_ids: poiIds,
    is_active: body.is_active !== false,
    estimated_duration_min:
      typeof body.estimated_duration_min === 'number' && Number.isFinite(body.estimated_duration_min)
        ? Math.round(body.estimated_duration_min)
        : null,
  };

  for (const field of TOUR_TEXT_FIELDS) {
    payload[field] =
      field === 'name_vi' ? (typeof body[field] === 'string' ? body[field].trim() : '') : toNullableText(body[field]);
  }

  if (typeof createdBy !== 'undefined') {
    payload.created_by = createdBy;
  }

  return payload;
}

export async function GET(request: NextRequest) {
  const supabase = await createServerClient();
  const searchParams = request.nextUrl.searchParams;
  const adminView = searchParams.get('admin_view') === 'true';
  const includeDeleted = searchParams.get('include_deleted') === 'true';

  if (adminView || includeDeleted) {
    const isAdmin = await isUserAdmin(supabase);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
  }

  let query = supabase.from('tours').select('*').order('created_at', { ascending: false });

  if (!includeDeleted) {
    query = query.is('deleted_at', null);
  }

  if (!adminView) {
    query = query.eq('is_active', true).is('deleted_at', null);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const profile = await getCurrentUserProfile(supabase);

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const poiIds = sanitizePoiIds(body.poi_ids);
    const nameVi = typeof body.name_vi === 'string' ? body.name_vi.trim() : '';

    if (!nameVi) {
      return NextResponse.json({ error: 'Thiếu tên tour tiếng Việt' }, { status: 400 });
    }

    const poiValidationError = await validatePoiIds(supabase, poiIds);
    if (poiValidationError) {
      return NextResponse.json({ error: poiValidationError }, { status: 400 });
    }

    const payload = buildPayload(body, poiIds, profile.id);
    const { data, error } = await supabase.from('tours').insert(payload).select('*').single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
