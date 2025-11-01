import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export async function GET() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ credits: 0 });
  const { data } = await supabase.from("profiles").select("listing_credits").eq("id", user.id).single();
  return NextResponse.json({ credits: data?.listing_credits ?? 0 });
}
