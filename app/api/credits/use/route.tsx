import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export async function POST() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: prof } = await supabase.from("profiles").select("listing_credits").eq("id", user.id).single();
  const current = prof?.listing_credits ?? 0;
  if (current <= 0) return NextResponse.json({ error: "No credits" }, { status: 400 });

  const { error } = await supabase.from("profiles").update({ listing_credits: current - 1 }).eq("id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ credits: current - 1 });
}
