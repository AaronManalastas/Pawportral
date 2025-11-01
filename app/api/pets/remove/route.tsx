// Ensure Node runtime (safe for service role client)
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!; // add to .env.local

/**
 * Body: { ids: string[] }
 * Deletes pets and notifies each pet owner that an admin removed their pet.
 */
export async function POST(req: NextRequest) {
  try {
    const { ids } = (await req.json()) as { ids?: string[] };
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No pet IDs provided." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // 1) Fetch FULL rows so we don't name columns that might not exist
    const { data: pets, error: petsErr } = await supabase
      .from("pets")
      .select("*")            // ✅ avoid selecting non-existent columns explicitly
      .in("id", ids);

    if (petsErr) return NextResponse.json({ error: petsErr.message }, { status: 500 });
    if (!pets?.length) return NextResponse.json({ error: "Pets not found." }, { status: 404 });

    // Normalize owner id from whatever field your schema uses
    const owners = (pets as any[]).map((p) => {
      const owner_id =
        p.owner_id ||
        p.user_id ||
        p.posted_by ||
        p.created_by ||
        p.ownerid ||  // just in case it was saved lowercased
        null;
      return { id: p.id as string, name: (p.name as string) ?? null, owner_id };
    });

    // 2) Delete pets
    const { error: delErr } = await supabase.from("pets").delete().in("id", ids);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

    // 3) Insert notifications for owners using SERVICE ROLE (bypass RLS)
    const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const notifications = owners
      .filter((p) => p.owner_id)
      .map((p) => ({
        user_id: p.owner_id!,                          // <-- bell filters by this
        type: "pet_removed",                           // <-- your bell now renders this
        title: "Your pet was removed by an admin",
        body: p.name ? `The listing “${p.name}” was removed.` : "Your pet listing was removed.",
        pet_id: p.id,
        // If you have a jsonb column `data`, you can add: data: { pet_id: p.id, pet_name: p.name }
      }));

    if (notifications.length) {
      const { error: notifErr } = await service.from("notifications").insert(notifications);
      if (notifErr) {
        return NextResponse.json(
          { ok: true, removed: ids.length, warning: `Notifications failed: ${notifErr.message}` },
          { status: 200 }
        );
      }
    }

    return NextResponse.json({ ok: true, removed: ids.length }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unexpected error." }, { status: 500 });
  }
}
