import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // must be set
const service = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

export async function POST(req: Request) {
  const { action, userIds, days } = await req.json();

  if (!Array.isArray(userIds) || userIds.length === 0) {
    return NextResponse.json({ error: "No user IDs provided" }, { status: 400 });
  }

  try {
    if (action === "verify") {
      const { data, error } = await service
        .from("profiles")
        .update({ is_verified: true })
        .in("id", userIds)
        .select("id,is_verified");
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true, updated: data });
    }

    // 🔹 UNVERIFY
    if (action === "unverify") {
      const { data, error } = await service
        .from("profiles")
        .update({ is_verified: false })
        .in("id", userIds)
        .select("id,is_verified");
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true, updated: data });
    }

    if (action === "suspend") {
      const until = new Date();
      until.setDate(until.getDate() + (Number(days) || 7));
      const { data, error } = await service
        .from("profiles")
        .update({ is_suspended: true, suspended_until: until.toISOString() })
        .in("id", userIds)
        .select("id,is_suspended,suspended_until");
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true, updated: data });
    }

    if (action === "unsuspend") {
      const { data, error } = await service
        .from("profiles")
        .update({ is_suspended: false, suspended_until: null })
        .in("id", userIds)
        .select("id,is_suspended,suspended_until");
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true, updated: data });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to process bulk action" },
      { status: 500 }
    );
  }
}
