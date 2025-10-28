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
    return createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: { persistSession: false, autoRefreshToken: false },
      }
    );
  } catch {
    return null;
  }
})();

// Server client with anon key (safe for server-side, not for writes requiring RLS bypass)
export function supabaseServer() {
  if (!globalClients._supabaseServerClient) {
    globalClients._supabaseServerClient = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: { persistSession: false },
      }
    );
  }

  return globalClients._supabaseServerClient;
}

// Admin client for ingestion (NEVER expose to client/edge). Use only in Node runtime.
export function supabaseAdmin() {
  if (!globalClients._supabaseAdminClient) {
    globalClients._supabaseAdminClient = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: { persistSession: false },
      }
    );
  }

  return globalClients._supabaseAdminClient;
}
