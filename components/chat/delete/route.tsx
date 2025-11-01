// app/api/chat/delete/route.ts
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  const supabase = getSupabaseServerClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return NextResponse.json({ error: userErr?.message || "Not authenticated" }, { status: 401 });
  }

  const { message_id } = (await req.json().catch(() => ({}))) as { message_id?: string };
  if (!message_id) return NextResponse.json({ error: "message_id required" }, { status: 400 });

  // Ensure I am the sender (RLS will also enforce)
  const { data: msg, error: mErr } = await supabase
    .from("messages")
    .select("id, sender_id, conversation_id")
    .eq("id", message_id)
    .maybeSingle();

  if (mErr || !msg) {
    return NextResponse.json({ error: mErr?.message || "Message not found" }, { status: 404 });
  }
  if (msg.sender_id !== user.id) {
    return NextResponse.json({ error: "Only the sender can delete this message" }, { status: 403 });
  }

  const { error: uErr } = await supabase
    .from("messages")
    .update({ deleted_at: new Date().toISOString(), deleted_by: user.id, body: null })
    .eq("id", message_id);

  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
