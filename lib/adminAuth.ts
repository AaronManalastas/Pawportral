// lib/adminAuth.ts
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

// Optional: service-role client (server only) to bypass RLS for profile reads
let getSvc: (() => any) | null = null;
try {
  // dynamic import so it won't crash builds when key is missing
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  getSvc = require("@/lib/supabaseServiceRole")?.getSupabaseServiceRole ?? null;
} catch {
  getSvc = null;
}

type Profile = {
  id: string;
  role?: string | null;
  is_admin?: boolean | null;
  is_suspended?: boolean | null;
};

export async function requireAdmin() {
  // 1) Must be logged in
  const supabase = getSupabaseServerClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) {
    redirect("/sign-in"); // your route is /sign-in
  }

  // 2) Email allowlist fallback (comma-separated)
  const adminEmails =
    (process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
      .split(",")
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);
  if (user?.email && adminEmails.includes(user.email.toLowerCase())) {
    // allowed immediately
    return { supabase, user, profile: { id: user.id, role: "admin", is_admin: true, is_suspended: false } as Profile };
  }

  // Helper to read profile (svc first, then regular)
  async function readProfile(): Promise<Profile | null> {
    // Prefer service-role if available and key is set
    const SVC_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (getSvc && SVC_KEY) {
      const svc = getSvc();
      const { data, error } = await svc
        .from("profiles")
        .select("id, role, is_admin, is_suspended")
        .eq("id", user!.id)
        .maybeSingle();
      if (!error && data) return data as Profile;
    }
    // Fallback to cookie-aware client (requires RLS allowing self-select)
    const { data, error } = await supabase
      .from("profiles")
      .select("id, role, is_admin, is_suspended")
      .eq("id", user!.id)
      .maybeSingle();
    if (!error && data) return data as Profile;
    return null;
  }

  // 3) Try to get the profile
  let profile = await readProfile();

  // 4) If missing and service-role is available, create / upsert the row
  if (!profile && getSvc && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const svc = getSvc();
    // If there are zero admins, make the first one admin
    const { data: anyAdmin } = await svc
      .from("profiles")
      .select("id", { head: true, count: "exact" })
      .or("role.eq.admin,is_admin.eq.true");
    const noAdminsYet = (anyAdmin as any)?.length === 0 || anyAdmin == null;

    const upsertRes = await svc.from("profiles").upsert(
      {
        id: user!.id,
        full_name: (user!.user_metadata as any)?.full_name ?? "",
        role: noAdminsYet ? "admin" : "user",
        is_admin: noAdminsYet ? true : false,
        is_suspended: false,
      },
      { onConflict: "id" }
    );
    if (!upsertRes.error) {
      profile = await readProfile();
    }
  }

  // 5) Final checks (fail closed by redirecting, never throw)
  if (!profile) {
    redirect("/"); // no profile available -> deny
  }
  const isAdmin = profile.role === "admin" || profile.is_admin === true;
  const suspended = profile.is_suspended === true;
  if (!isAdmin || suspended) {
    redirect("/"); // not admin or suspended
  }

  return { supabase, user, profile };
}
