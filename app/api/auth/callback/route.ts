/**
 * Auth Callback Route
 * Xử lý OAuth callback từ Supabase
 */

import { createServerClient } from '@/lib/supabase/server';
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
      const desiredRole = accountType === 'owner' ? 'owner' : 'customer';

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

      const timestamp = new Date().toISOString();
      const isExistingAdmin = existingProfile?.role === 'admin';

      const { error: upsertError } = isExistingAdmin
        ? await adminClient
            .from('users')
            .upsert(
              {
                id: user.id,
                email: user.email,
                updated_at: timestamp,
              },
              { onConflict: 'id' }
            )
        : await adminClient
            .from('users')
            .upsert(
              {
                id: user.id,
                email: user.email,
                role: desiredRole,
                updated_at: timestamp,
              },
              { onConflict: 'id' }
            );

      if (upsertError) {
        console.error('Auth callback upsert error:', upsertError);
        return NextResponse.redirect(`${origin}/login?error=auth_failed`);
      }

      if (isExistingAdmin) {
        return NextResponse.redirect(`${origin}/admin`);
      }

      // Chỉ redirect theo accountType người dùng đã chọn ở màn hình login.
      // Trang /admin chỉ truy cập thủ công, không auto redirect.
      if (desiredRole === 'owner') {
        return NextResponse.redirect(`${origin}/owner`);
      }
    }
  }

  // Redirect to tour page after successful login (mặc định cho customer)
  return NextResponse.redirect(`${origin}/tour`);
}
