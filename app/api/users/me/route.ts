import { createServerClient, getCurrentUserProfile } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

export async function GET() {
  const supabase = await createServerClient();
  const profile = await getCurrentUserProfile(supabase);

  if (!profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE_HEADERS });
  }

  return NextResponse.json(
    {
      id: profile.id,
      email: profile.email,
      role: profile.role,
      customerAccessGranted: profile.customerAccessGranted,
      customerAccessGrantedAt: profile.customerAccessGrantedAt,
    },
    { headers: NO_STORE_HEADERS }
  );
}
