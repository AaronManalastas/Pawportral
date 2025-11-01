// lib/supabaseAdmin.ts
import { createClient } from "@supabase/supabase-js";

// Keep a single instance in dev/HMR
declare global {
  // eslint-disable-next-line no-var
  var __supabase_admin__: ReturnType<typeof createClient> | undefined;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // never expose to the browser

export function getSupabaseAdmin() {
  if (typeof window !== "undefined") {
    // Extra safety – prevents accidental import on client
    throw new Error("getSupabaseAdmin() must only be called on the server.");
  }

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Supabase: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  if (!globalThis.__supabase_admin__) {
    globalThis.__supabase_admin__ = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });
  }

  return globalThis.__supabase_admin__;
}
