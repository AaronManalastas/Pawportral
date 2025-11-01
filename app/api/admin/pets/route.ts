import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/adminAuth";

export async function GET(req: Request) {
  await requireAdmin();
  const url = new URL(req.url);
  const status = url.searchParams.get("status"); // "available" | "reserved" | "adopted" | "all" | null

  const supabase = getSupabaseServerClient();
  let q = supabase
    .from("pets")
    .select("id, name, type, breed, age_months, status, owner_id, created_at")
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    // PostgREST can't do lower(column), so match common variants
    const s = status.toLowerCase();
    const cap = s.charAt(0).toUpperCase() + s.slice(1);
    q = q.or(`status.eq.${s},status.eq.${cap},status.eq.${s.toUpperCase()}`);
  }

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: Request) {
  await requireAdmin();
  const body = await req.json();
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("pets").insert(body).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data?.id });
}

export async function PATCH(req: Request) {
  await requireAdmin();
  const { action, ids } = await req.json();
  if (!Array.isArray(ids) || !action) return NextResponse.json({ error: "Missing params" }, { status: 400 });

  const supabase = getSupabaseServerClient();
  let update: Record<string, any> = {};
  if (action === "adopt") update.status = "approved" /* or "adopted" — match your actual status */;
  if (action === "archive") update.status = "archived";
  if (action === "feature") update.featured = true;

  const { error } = await supabase.from("pets").update(update).in("id", ids);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
