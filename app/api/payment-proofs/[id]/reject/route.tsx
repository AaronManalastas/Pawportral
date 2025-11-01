import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!me || !["admin","superadmin"].includes((me as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { notes } = await req.json().catch(() => ({ notes: null }));
  await supabase
    .from("payment_proofs")
    .update({ status: "rejected", notes: notes ?? null, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    .eq("id", params.id);

  return NextResponse.json({ ok: true });
}
