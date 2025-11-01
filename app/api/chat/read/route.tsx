// app/api/chat/read/route.ts
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  const { conversation_id } = (await req.json()) as { conversation_id?: string };
  if (!conversation_id) return NextResponse.json({ error: "conversation_id required" }, { status: 400 });

  const supabase = getSupabaseServerClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: userErr?.message || "Not authenticated" }, { status: 401 });

  // Upsert my last_read_at
  const { error } = await supabase
    .from("conversation_reads")
    .upsert({ conversation_id, user_id: user.id, last_read_at: new Date().toISOString() }, { onConflict: "conversation_id,user_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
