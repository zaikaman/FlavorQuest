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
      const adminEmails = (process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
        .split(',')
        .map(email => email.trim().toLowerCase())
        .filter(Boolean);

      const desiredRole = accountType === 'owner' ? 'owner' : 'customer';
      const role = adminEmails.includes(user.email.toLowerCase()) ? 'admin' : desiredRole;

      const adminClient = createAdminClient();
      await adminClient
        .from('users')
        .upsert(
          {
            id: user.id,
            email: user.email,
            role,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );

      // Redirect dựa trên role của user
      if (role === 'admin') {
        return NextResponse.redirect(`${origin}/admin`);
      } else if (role === 'owner') {
        return NextResponse.redirect(`${origin}/owner`);
      }
    }
  }

  // Redirect to tour page after successful login (mặc định cho customer)
  return NextResponse.redirect(`${origin}/tour`);
}
