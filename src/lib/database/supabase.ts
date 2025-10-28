import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';

import env from '@/src/lib/config/env';

// Share Supabase instances across hot reloads and server invocations
const globalClients = globalThis as typeof globalThis & {
  _supabaseServerClient?: SupabaseClient;
  _supabaseAdminClient?: SupabaseClient;
};

// Public client (safe for browser) using anon key
export const supabaseBrowser = (() => {
  try {
    // Use process.env directly for NEXT_PUBLIC_ vars in browser
    // Next.js replaces these at build time
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      console.warn('Supabase browser client: missing URL or anon key', {
        hasUrl: !!url,
        hasKey: !!anonKey,
        nodeEnv: process.env.NODE_ENV,
      });
      return null;
    }

    return createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  } catch (err) {
    console.error('Failed to create Supabase browser client:', err);
    return null;
  }
})();

// Server client with anon key (safe for server-side, not for writes requiring RLS bypass)
export function supabaseServer() {
  // Use env for server-side (has validated values)
  const url =
    env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Supabase server: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY required'
    );
  }

  if (!globalClients._supabaseServerClient) {
    globalClients._supabaseServerClient = createClient(url, anonKey, {
      auth: { persistSession: false },
    });
  }

  return globalClients._supabaseServerClient;
}

// Admin client for ingestion (NEVER expose to client/edge). Use only in Node runtime.
export function supabaseAdmin() {
  // Use env for server-side (has validated values)
  const url =
    env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Supabase admin: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required'
    );
  }

  if (!globalClients._supabaseAdminClient) {
    globalClients._supabaseAdminClient = createClient(url, serviceRoleKey, {
      auth: { persistSession: false },
    });
  }

  return globalClients._supabaseAdminClient;
}
