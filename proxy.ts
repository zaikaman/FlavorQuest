import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

type RouteRole = 'customer' | 'pending-owner' | 'owner' | 'admin';
type OwnerRequestStatus = 'pending' | 'approved' | 'rejected';

interface RouteProfile {
  userId: string | null;
  role: RouteRole | null;
  customerAccessGranted: boolean;
  ownerRequestStatus: OwnerRequestStatus | null;
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
    return {
      response: NextResponse.next(),
      profile: {
        userId: null,
        role: null,
        customerAccessGranted: true,
        ownerRequestStatus: null,
      } as RouteProfile,
    };
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
        customerAccessGranted: true,
        ownerRequestStatus: null,
      } satisfies RouteProfile,
    };
  }

  const { data } = await supabase
    .from('users')
    .select('role, customer_access_granted, owner_request_status')
    .eq('id', user.id)
    .maybeSingle();

  const role =
    data?.role === 'admin'
      ? 'admin'
      : data?.role === 'owner'
        ? 'owner'
        : data?.role === 'pending-owner'
          ? 'pending-owner'
          : 'customer';

  const ownerRequestStatus =
    data?.owner_request_status === 'pending' ||
    data?.owner_request_status === 'approved' ||
    data?.owner_request_status === 'rejected'
      ? data.owner_request_status
      : null;

  return {
    response,
    profile: {
      userId: user.id,
      role,
      customerAccessGranted: role === 'customer' ? true : false,
      ownerRequestStatus,
    } satisfies RouteProfile,
  };
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const { response, profile } = await resolveProfile(request);
  const isAdminLoginPage = pathname === '/admin/login';

  if (pathname.startsWith('/admin')) {
    if (!profile.userId) {
      if (isAdminLoginPage) {
        return response;
      }

      return redirect(request, '/admin/login');
    }

    if (profile.role !== 'admin') {
      if (profile.role === 'owner') {
        return redirect(request, '/owner');
      }
      if (profile.role === 'pending-owner') {
        return redirect(request, '/pending-owner');
      }
      return redirect(request, '/tour');
    }

    if (isAdminLoginPage) {
      return redirect(request, '/admin');
    }

    return response;
  }

  if (pathname.startsWith('/owner')) {
    if (!profile.userId) {
      return redirect(request, '/login', { type: 'owner' });
    }

    if (profile.role !== 'owner' && profile.role !== 'admin') {
      if (profile.role === 'pending-owner') {
        return redirect(request, '/pending-owner');
      }

      return redirect(request, '/tour');
    }

    return response;
  }

  if (pathname.startsWith('/pending-owner')) {
    if (!profile.userId) {
      return redirect(request, '/login', { type: 'owner' });
    }

    if (profile.role === 'admin') {
      return redirect(request, '/admin');
    }

    if (profile.role === 'owner') {
      return redirect(request, '/owner');
    }

    if (profile.role === 'pending-owner') {
      return response;
    }

    return redirect(request, '/tour');
  }

  if (pathname.startsWith('/tour')) {
    if (!profile.userId) {
      return redirect(request, '/login', { type: 'customer' });
    }

    if (profile.role === 'owner') {
      return redirect(request, '/owner');
    }

    if (profile.role === 'pending-owner') {
      return redirect(request, '/pending-owner');
    }

    return response;
  }

  if (pathname.startsWith('/paywall')) {
    if (!profile.userId) {
      return redirect(request, '/login', { type: 'customer' });
    }

    if (profile.role === 'admin') {
      return redirect(request, '/admin');
    }

    if (profile.role === 'owner') {
      return redirect(request, '/owner');
    }

    if (profile.role === 'pending-owner') {
      return redirect(request, '/pending-owner');
    }

    return redirect(request, '/tour');
  }

  return response;
}

export const config = {
  matcher: ['/tour/:path*', '/paywall/:path*', '/owner/:path*', '/admin/:path*', '/pending-owner'],
};
