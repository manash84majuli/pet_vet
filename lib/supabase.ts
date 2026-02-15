/**
 * Supabase Client Configuration
 * Provides typed client for both server & client components
 */

import { createClient } from "@supabase/supabase-js";
import {
  createBrowserClient as createSsrBrowserClient,
  createServerClient as createSsrServerClient,
  type CookieOptions,
} from "@supabase/ssr";
import { Database } from "./database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase URL or anon key. Check .env.local for NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );
}

/**
 * Browser client - use this in client components
 */
export const createBrowserClient = () =>
  createSsrBrowserClient<Database>(supabaseUrl, supabaseAnonKey);

/**
 * Server client - use this in Server Actions and API routes
 * For service role operations, use SERVICE_ROLE_KEY
 */
type CookieStore = {
  get: (name: string) => { value: string } | undefined;
  set: (name: string, value: string, options?: CookieOptions) => void;
  delete: (
    ...args: [string] | [{ name: string } & CookieOptions]
  ) => void | unknown;
};

const removeCookie = (cookieStore: CookieStore, name: string, options?: CookieOptions) => {
  if (options) {
    cookieStore.delete({ name, ...options });
    return;
  }

  cookieStore.delete(name);
};

export const createServerClient = (cookieStore: CookieStore) =>
  createSsrServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get: (name) => cookieStore.get(name)?.value,
      set: (name, value, options) => cookieStore.set(name, value, options),
      remove: (name, options) => removeCookie(cookieStore, name, options),
    },
  });

/**
 * Admin client with service role key - for sensitive operations only
 * Use ONLY in Server Actions / API routes where you control the code
 */
export const createAdminClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Required for admin operations."
    );
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};


