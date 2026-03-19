import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

function isAuthorized(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    throw new Error('Missing CRON_SECRET');
  }

  const authorization = request.headers.get('authorization');
  const bearerToken = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length).trim()
    : null;
  const queryToken = request.nextUrl.searchParams.get('secret');

  return bearerToken === cronSecret || queryToken === cronSecret;
}

async function pingSupabase() {
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .limit(1);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

async function handleKeepAlive(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userCount = await pingSupabase();

    return NextResponse.json(
      {
        ok: true,
        message: 'Supabase keep-alive succeeded',
        checkedAt: new Date().toISOString(),
        userCount,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[cron/supabase-keepalive] failed:', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Internal Server Error',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handleKeepAlive(request);
}

export async function HEAD(request: NextRequest) {
  const response = await handleKeepAlive(request);
  return new NextResponse(null, {
    status: response.status,
    headers: response.headers,
  });
}
