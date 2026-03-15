/**
 * Auth Callback Route
 * Xử lý OAuth callback từ Supabase
 */

import { createServerClient } from '@/lib/supabase/server';
import { ensureOwnerRequestForUser } from '@/lib/server/owner-requests';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const accountType = requestUrl.searchParams.get('accountType');
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createServerClient();

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Auth callback error:', error);
      return NextResponse.redirect(`${origin}/login?error=auth_failed`);
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.id && user.email) {
      const adminClient = createAdminClient();
      const { data: existingProfile, error: existingProfileError } = await adminClient
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (existingProfileError) {
        console.error('Auth callback profile lookup error:', existingProfileError);
        return NextResponse.redirect(`${origin}/login?error=auth_failed`);
      }

      const existingRole = existingProfile?.role ?? null;

      if (existingRole === 'admin') {
        return NextResponse.redirect(`${origin}/admin`);
      }

      if (existingRole === 'owner') {
        return NextResponse.redirect(`${origin}/owner`);
      }

      if (existingRole === 'pending-owner') {
        return NextResponse.redirect(`${origin}/pending-owner`);
      }

      if (accountType === 'owner') {
        try {
          const result = await ensureOwnerRequestForUser({
            id: user.id,
            email: user.email,
          });

          return NextResponse.redirect(`${origin}${result.redirectTo}`);
        } catch (ownerRequestError) {
          console.error('Auth callback owner request error:', ownerRequestError);
          return NextResponse.redirect(`${origin}/login?error=auth_failed`);
        }
      }

      const timestamp = new Date().toISOString();
      const { error: upsertError } = await adminClient.from('users').upsert(
        {
          id: user.id,
          email: user.email,
          role: 'customer',
          updated_at: timestamp,
        },
        { onConflict: 'id' }
      );

      if (upsertError) {
        console.error('Auth callback upsert error:', upsertError);
        return NextResponse.redirect(`${origin}/login?error=auth_failed`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/tour`);
}
