// app/api/chat/conversations/route.ts
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PetMini = { id: string; name: string | null; photo_url: string | null };
type ConvoRow = {
  id: string;
  pet_id: string;
  owner_id: string;
  adopter_id: string;
  pets: PetMini | null;
};

const nocache = () => ({
  "Cache-Control": "no-store, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
});

// normalize any row → ConvoRow
function toConvoRow(row: any): ConvoRow {
  const p = row?.pets
    ? ({ id: row.pets.id, name: row.pets.name ?? null, photo_url: row.pets.photo_url ?? null } as PetMini)
    : null;
  return {
    id: String(row.id),
    pet_id: String(row.pet_id),
    owner_id: String(row.owner_id),
    adopter_id: String(row.adopter_id),
    pets: p,
  };
}

export async function GET() {
  const headers = nocache();
  const supabase = getSupabaseServerClient();

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401, headers });
  if (!user) return NextResponse.json([], { status: 200, headers });

  const me = user.id;

  // conversations where I'm owner or adopter
  const { data: convos1Raw, error: convErr1 } = await supabase
    .from("conversations")
    .select(
      `
        id,
        pet_id,
        owner_id,
        adopter_id,
        pets:pet_id ( id, name, photo_url )
      `
    )
    .or(`owner_id.eq.${me},adopter_id.eq.${me}`)
    .order("updated_at", { ascending: false });

  if (convErr1) return NextResponse.json({ error: convErr1.message }, { status: 500, headers });

  // add any conversation where I've sent a message (safety net)
  const { data: myMsgConvIds, error: msgErr } = await supabase
    .from("messages")
    .select("conversation_id")
    .eq("sender_id", me);

  if (msgErr) return NextResponse.json({ error: msgErr.message }, { status: 500, headers });

  const have = new Set((convos1Raw ?? []).map((c: any) => c.id as string));
  const extras = (myMsgConvIds ?? [])
    .map((r: any) => r.conversation_id as string)
    .filter((id) => id && !have.has(id));

  let convos2Raw: any[] = [];
  if (extras.length) {
    const { data, error: convErr2 } = await supabase
      .from("conversations")
      .select(
        `
          id,
          pet_id,
          owner_id,
          adopter_id,
          pets:pet_id ( id, name, photo_url )
        `
      )
      .in("id", extras);

    if (convErr2) return NextResponse.json({ error: convErr2.message }, { status: 500, headers });
    convos2Raw = data ?? [];
  }

  const convos: ConvoRow[] = [ ...(convos1Raw ?? []), ...convos2Raw ].map(toConvoRow);
  if (!convos.length) return NextResponse.json([], { status: 200, headers });

  const results: Array<{
    id: string;
    pet: { id: string; name: string; photo_url: string | null };
    lastMessage: string | null;
    unread: number;
    iAmOwner: boolean;
    iAmAdopter: boolean;
  }> = [];

  for (const c of convos) {
    const { data: lastMsg } = await supabase
      .from("messages")
      .select("body, created_at, sender_id")
      .eq("conversation_id", c.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: readRow } = await supabase
      .from("conversation_reads")
      .select("last_read_at")
      .eq("conversation_id", c.id)
      .eq("user_id", me)
      .maybeSingle();

    // unread: only messages from others since my last_read_at
    let unread = 0;
    if (readRow?.last_read_at) {
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", c.id)
        .neq("sender_id", me)
        .gt("created_at", readRow.last_read_at);
      unread = count ?? 0;
    } else {
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", c.id)
        .neq("sender_id", me);
      unread = count ?? 0;
    }

    const pet = c.pets;
    results.push({
      id: c.id,
      pet: { id: pet?.id ?? c.pet_id, name: pet?.name ?? "Pet", photo_url: pet?.photo_url ?? null },
      lastMessage: lastMsg?.body ?? null,
      unread,
      iAmOwner: c.owner_id === me,
      iAmAdopter: c.adopter_id === me,
    });
  }

  return NextResponse.json(results, { status: 200, headers });
}
