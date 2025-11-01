// app/api/chat/mark-read/route.ts
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  const supabase = getSupabaseServerClient();

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: authErr?.message || "Unauthorized" }, { status: 401 });
  }

  const { conversation_id } = await req.json();
  if (!conversation_id) {
    return NextResponse.json({ ok: false, error: "conversation_id required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("conversation_reads")
    .upsert(
      {
        conversation_id,
        user_id: user.id,
        last_read_at: new Date().toISOString(),
      },
      { onConflict: "conversation_id,user_id" }
    );

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}
