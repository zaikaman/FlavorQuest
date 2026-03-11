import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

type RouteRole = 'customer' | 'owner' | 'admin';

interface RouteProfile {
  userId: string | null;
  role: RouteRole | null;
  customerAccessGranted: boolean;
}

function redirect(request: NextRequest, pathname: string, params?: Record<string, string>) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = '';

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  return NextResponse.redirect(url);
}

async function resolveProfile(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return { response: NextResponse.next(), profile: { userId: null, role: null, customerAccessGranted: false } as RouteProfile };
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });

        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      response,
      profile: {
        userId: null,
        role: null,
        customerAccessGranted: false,
      } satisfies RouteProfile,
    };
  }

  const adminEmails = (process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean);

  if (user.email && adminEmails.includes(user.email.toLowerCase())) {
    return {
      response,
      profile: {
        userId: user.id,
        role: 'admin',
        customerAccessGranted: true,
      } satisfies RouteProfile,
    };
  }

  const { data } = await supabase
    .from('users')
    .select('role, customer_access_granted')
    .eq('id', user.id)
    .maybeSingle();

  const role = data?.role === 'admin'
    ? 'admin'
    : data?.role === 'owner'
      ? 'owner'
      : 'customer';

  return {
    response,
    profile: {
      userId: user.id,
      role,
      customerAccessGranted: role === 'customer' ? data?.customer_access_granted ?? false : true,
    } satisfies RouteProfile,
  };
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const { response, profile } = await resolveProfile(request);

  if (pathname.startsWith('/admin')) {
    if (!profile.userId) {
      return redirect(request, '/login');
    }

    if (profile.role !== 'admin') {
      if (profile.role === 'owner') {
        return redirect(request, '/owner');
      }
      return redirect(request, profile.customerAccessGranted ? '/tour' : '/paywall');
    }

    return response;
  }

  if (pathname.startsWith('/owner')) {
    if (!profile.userId) {
      return redirect(request, '/login', { type: 'owner' });
    }

    if (profile.role !== 'owner' && profile.role !== 'admin') {
      return redirect(request, profile.customerAccessGranted ? '/tour' : '/paywall');
    }

    return response;
  }

  if (pathname.startsWith('/tour')) {
    if (!profile.userId) {
      return redirect(request, '/login', { type: 'customer' });
    }

    if (profile.role === 'owner') {
      return redirect(request, '/owner');
    }

    if (!profile.customerAccessGranted) {
      return redirect(request, '/paywall');
    }

    return response;
  }

  if (pathname.startsWith('/paywall')) {
    if (!profile.userId) {
      return redirect(request, '/login', { type: 'customer' });
    }

    if (profile.role === 'admin') {
      return redirect(request, '/tour');
    }

    if (profile.role === 'owner') {
      return redirect(request, '/owner');
    }

    const isSuccessPage = pathname.startsWith('/paywall/success');

    if (profile.customerAccessGranted) {
      if (isSuccessPage) {
        return response;
      }
      return redirect(request, '/tour');
    }

    if (isSuccessPage) {
      return redirect(request, '/paywall');
    }

    return response;
  }

  return response;
}

export const config = {
  matcher: ['/tour/:path*', '/paywall/:path*', '/owner/:path*', '/admin/:path*'],
};