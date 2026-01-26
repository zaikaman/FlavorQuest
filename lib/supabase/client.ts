/**
 * Supabase Client Configuration
 * 
 * Tạo Supabase clients cho:
 * - Client Components: Sử dụng trong browser với auth persistence
 * - Server Components: Sử dụng trong Server Components với cookies
 * - Server Actions: Sử dụng trong Server Actions với cookies
 * 
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/lib/types/database.types';

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
 * Create Supabase client cho Client Components
 * 
 * Sử dụng trong:
 * - 'use client' components
 * - Client-side hooks
 * - Browser-only code
 * 
 * Features:
 * - Automatic auth state persistence in localStorage
 * - Cookie-based session management
 * - Real-time subscriptions support
 * 
 * @example
 * ```tsx
 * 'use client';
 * import { createClient } from '@/lib/supabase/client';
 * 
 * export function MyComponent() {
 *   const supabase = createClient();
 *   
 *   useEffect(() => {
 *     const fetchPOIs = async () => {
 *       const { data } = await supabase.from('pois').select('*');
 *       console.log(data);
 *     };
 *     fetchPOIs();
 *   }, []);
 * }
 * ```
 */
export function createClient() {
  const { url, anonKey } = getSupabaseEnv();

  return createBrowserClient<Database>(url, anonKey, {
    cookies: {
      get(name: string) {
        // Browser environment - read from document.cookie
        if (typeof document === 'undefined') {
          return undefined;
        }
        
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        
        if (parts.length === 2) {
          return parts.pop()?.split(';').shift();
        }
        
        return undefined;
      },
      set(name: string, value: string, options: any) {
        // Browser environment - write to document.cookie
        if (typeof document === 'undefined') {
          return;
        }

        let cookie = `${name}=${value}`;

        if (options?.maxAge) {
          cookie += `; max-age=${options.maxAge}`;
        }

        if (options?.path) {
          cookie += `; path=${options.path}`;
        }

        if (options?.domain) {
          cookie += `; domain=${options.domain}`;
        }

        if (options?.secure) {
          cookie += '; secure';
        }

        if (options?.httpOnly) {
          cookie += '; httponly';
        }

        if (options?.sameSite) {
          cookie += `; samesite=${options.sameSite}`;
        }

        document.cookie = cookie;
      },
      remove(name: string, options: any) {
        // Browser environment - delete cookie by setting max-age=0
        if (typeof document === 'undefined') {
          return;
        }

        let cookie = `${name}=; max-age=0`;

        if (options?.path) {
          cookie += `; path=${options.path}`;
        }

        if (options?.domain) {
          cookie += `; domain=${options.domain}`;
        }

        document.cookie = cookie;
      },
    },
  });
}

/**
 * Type-safe Supabase client
 * Generic type parameter Database cung cấp auto-completion và type checking
 */
export type SupabaseClient = ReturnType<typeof createClient>;

/**
 * Helper function: Check if user is authenticated
 * 
 * @example
 * ```tsx
 * const supabase = createClient();
 * const isAuth = await isAuthenticated(supabase);
 * if (!isAuth) {
 *   router.push('/login');
 * }
 * ```
 */
export async function isAuthenticated(client: SupabaseClient): Promise<boolean> {
  const { data: { session } } = await client.auth.getSession();
  return !!session;
}

/**
 * Helper function: Get current user
 * 
 * @example
 * ```tsx
 * const supabase = createClient();
 * const user = await getCurrentUser(supabase);
 * console.log(user?.email);
 * ```
 */
export async function getCurrentUser(client: SupabaseClient) {
  const { data: { user } } = await client.auth.getUser();
  return user;
}

/**
 * Helper function: Sign out user
 * 
 * @example
 * ```tsx
 * const supabase = createClient();
 * await signOut(supabase);
 * router.push('/');
 * ```
 */
export async function signOut(client: SupabaseClient) {
  const { error } = await client.auth.signOut();
  if (error) {
    throw new Error(`Sign out failed: ${error.message}`);
  }
}
