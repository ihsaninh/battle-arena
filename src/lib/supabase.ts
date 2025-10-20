import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";

// Share Supabase instances across hot reloads and server invocations
const globalClients = globalThis as typeof globalThis & {
  _supabaseServerClient?: SupabaseClient;
  _supabaseAdminClient?: SupabaseClient;
};

// Public client (safe for browser) using anon key
export const supabaseBrowser = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
})();

// Server client with anon key (safe for server-side, not for writes requiring RLS bypass)
export function supabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error("Supabase env missing");

  if (!globalClients._supabaseServerClient) {
    globalClients._supabaseServerClient = createClient(url, anon, {
      auth: { persistSession: false },
    });
  }

  return globalClients._supabaseServerClient;
}

// Admin client for ingestion (NEVER expose to client/edge). Use only in Node runtime.
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) throw new Error("Supabase admin env missing");

  if (!globalClients._supabaseAdminClient) {
    globalClients._supabaseAdminClient = createClient(url, serviceRole, {
      auth: { persistSession: false },
    });
  }

  return globalClients._supabaseAdminClient;
}