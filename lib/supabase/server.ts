/**
 * Supabase Server Client Configuration
 * 
 * Tạo Supabase clients cho server-side rendering:
 * - Server Components
 * - Server Actions
 * - Route Handlers
 * - Middleware
 * 
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */

import { createServerClient as createSupabaseServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Lấy Supabase environment variables
 * Throw error nếu thiếu để catch lỗi sớm
 */
function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Missing Supabase environment variables. ' +
      'Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
    );
  }

  return { url, anonKey };
}

/**
 * Create Supabase client cho Server Components
 * 
 * Sử dụng trong:
 * - Server Components (default in App Router)
 * - Server-side data fetching
 * - API Route Handlers
 * 
 * Features:
 * - Automatic cookie handling với Next.js cookies()
 * - Server-side auth state management
 * - No client-side JavaScript required
 * 
 * @example
 * ```tsx
 * // In Server Component
 * import { createServerClient } from '@/lib/supabase/server';
 * 
 * export default async function Page() {
 *   const supabase = await createServerClient();
 *   const { data: pois } = await supabase.from('pois').select('*');
 *   
 *   return <div>{pois?.map(poi => <Card key={poi.id} {...poi} />)}</div>;
 * }
 * ```
 * 
 * @example
 * ```tsx
 * // In Route Handler (app/api/pois/route.ts)
 * import { createServerClient } from '@/lib/supabase/server';
 * 
 * export async function GET() {
 *   const supabase = await createServerClient();
 *   const { data } = await supabase.from('pois').select('*');
 *   return Response.json(data);
 * }
 * ```
 */
export async function createServerClient() {
  const { url, anonKey } = getSupabaseEnv();
  const cookieStore = await cookies();

  return createSupabaseServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: any) {
        try {
          cookiesToSet.forEach(({ name, value, options }: any) => {
            cookieStore.set(name, value, options);
          });
        } catch (error) {
          // Ignore errors from set() in Server Components
          // This can happen if cookies are set after headers are sent
        }
      },
    },
  });
}

/**
 * Create Supabase client cho Server Actions
 * 
 * Sử dụng trong:
 * - Server Actions (async functions với 'use server')
 * - Form submissions
 * - Mutations from client components
 * 
 * Features:
 * - Mutable cookies support (can set cookies)
 * - Better error handling for mutations
 * - Automatic revalidation support
 * 
 * @example
 * ```tsx
 * 'use server';
 * import { createServerActionClient } from '@/lib/supabase/server';
 * 
 * export async function updatePOI(formData: FormData) {
 *   const supabase = await createServerActionClient();
 *   
 *   const { error } = await supabase
 *     .from('pois')
 *     .update({ name_vi: formData.get('name') })
 *     .eq('id', formData.get('id'));
 *   
 *   if (error) {
 *     return { success: false, error: error.message };
 *   }
 *   
 *   return { success: true };
 * }
 * ```
 */
export async function createServerActionClient() {
  const { url, anonKey } = getSupabaseEnv();
  const cookieStore = await cookies();

  return createSupabaseServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: any) {
        // Server Actions can always set cookies
        cookiesToSet.forEach(({ name, value, options }: any) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
}

/**
 * Type-safe Supabase server client
 */
export type SupabaseServerClient = Awaited<ReturnType<typeof createServerClient>>;

/**
 * Helper: Check if user is authenticated (server-side)
 * 
 * @example
 * ```tsx
 * const supabase = await createServerClient();
 * const isAuth = await isAuthenticated(supabase);
 * if (!isAuth) {
 *   redirect('/login');
 * }
 * ```
 */
export async function isAuthenticated(client: SupabaseServerClient): Promise<boolean> {
  const { data: { session } } = await client.auth.getSession();
  return !!session;
}

/**
 * Helper: Get current user (server-side)
 * 
 * @example
 * ```tsx
 * const supabase = await createServerClient();
 * const user = await getCurrentUser(supabase);
 * console.log(user?.email);
 * ```
 */
export async function getCurrentUser(client: SupabaseServerClient) {
  const { data: { user } } = await client.auth.getUser();
  return user;
}

/**
 * Helper: Check if current user is admin (server-side)
 * 
 * @example
 * ```tsx
 * const supabase = await createServerClient();
 * const isAdmin = await isUserAdmin(supabase);
 * if (!isAdmin) {
 *   return <div>Access denied</div>;
 * }
 * ```
 */
export async function isUserAdmin(client: SupabaseServerClient): Promise<boolean> {
  const { data: { user } } = await client.auth.getUser();
  
  if (!user) {
    return false;
  }

  const { data } = await client
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  return data?.role === 'admin';
}
