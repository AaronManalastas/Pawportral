// app/api/chat/send/route.ts
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  try {
    const { conversation_id, body } = (await req.json()) as {
      conversation_id?: string;
      body?: string;
    };

    if (!conversation_id || !body || !body.trim()) {
      return NextResponse.json(
        { error: "conversation_id and body are required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();

    // Use cookie-based auth (this is always present on server)
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      return NextResponse.json(
        { error: userErr?.message || "Not authenticated" },
        { status: 401 }
      );
    }

    // Make sure the caller is a participant in this conversation
    const { data: convo, error: cErr } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", conversation_id)
      .or(`owner_id.eq.${user.id},adopter_id.eq.${user.id}`)
      .maybeSingle();

    if (cErr) {
      return NextResponse.json({ error: cErr.message }, { status: 400 });
    }
    if (!convo) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }

    // Insert message (server has a valid user; RLS will pass)
    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id,
        sender_id: user.id,
        body: body.trim(),
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Realtime will fan this out to both clients
    return NextResponse.json({ ok: true, message: data });
  } catch (e: any) {
    return NextResponse.json(
      { error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
