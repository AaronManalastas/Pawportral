import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminAuth";

/**
 * Returns ALL app accounts (auth.users ⟵ LEFT JOIN ⟶ public.profiles),
 * excluding any with role='admin'.
 *
 * Requires env:
 *  - NEXT_PUBLIC_SUPABASE_URL
 *  - SUPABASE_SERVICE_ROLE_KEY  (server-side only)
 */
export async function GET(req: Request) {
  // protect the route (your existing helper)
  await requireAdmin();

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim().toLowerCase();
  const role = (url.searchParams.get("role") || "all").toLowerCase();

  // server-side service client so we can read auth.users
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1) list auth users
  const { data: listRes, error: authErr } = await supabase.auth.admin.listUsers();
  if (authErr) {
    return NextResponse.json({ error: authErr.message }, { status: 500 });
  }

  // 2) load profiles to join (id, role, etc.)
  const { data: profiles, error: profErr } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_suspended, created_at");
  if (profErr) {
    return NextResponse.json({ error: profErr.message }, { status: 500 });
  }

  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

  // 3) join + filters
  let items =
    (listRes?.users ?? []).map((u) => {
      const p = byId.get(u.id);
      const role = (p?.role ?? null) as string | null;

      return {
        id: u.id,
        full_name: p?.full_name ?? null,
        email: u.email ?? null,
        role,
        is_verified: !!u.email_confirmed_at,
        is_suspended: p?.is_suspended ?? false,
        created_at: u.created_at ?? p?.created_at ?? null,
      };
    })
    // exclude admins always
    .filter((row) => (row.role || "").toLowerCase() !== "admin");

  // optional non-admin role filter (owner/shelter/adopter)
  if (role !== "all") {
    items = items.filter((row) => (row.role || "").toLowerCase() === role);
  }

  // search
  const qLower = q.toLowerCase();
  if (qLower) {
    items = items.filter((row) =>
      `${row.full_name || ""} ${row.email || ""}`.toLowerCase().includes(qLower)
    );
  }

  // newest first
  items.sort((a, b) => (a.created_at || "").localeCompare(b.created_at || "")).reverse();

  return NextResponse.json({ items }, { status: 200 });
}
