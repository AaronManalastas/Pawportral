import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // If you have requireAdmin() use that; fallback to role check:
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!me || !["admin","superadmin"].includes((me as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: proof, error } = await supabase.from("payment_proofs").select("*").eq("id", params.id).single();
  if (error || !proof) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (proof.status === "approved") return NextResponse.json({ ok: true });

  const { data: prof } = await supabase.from("profiles").select("listing_credits").eq("id", proof.user_id).single();
  const current = prof?.listing_credits ?? 0;

  const { error: e2 } = await supabase.from("profiles").update({ listing_credits: current + 1 }).eq("id", proof.user_id);
  if (e2) return NextResponse.json({ error: e2.message }, { status: 400 });

  await supabase
    .from("payment_proofs")
    .update({ status: "approved", reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    .eq("id", params.id);

  return NextResponse.json({ ok: true });
}
