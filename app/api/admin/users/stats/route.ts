// app/api/admin/users/stats/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use service role key because this runs on the server
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// A lightweight, stateless client (no session persistence)
const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const ids = (searchParams.get("ids") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (ids.length === 0) {
      return NextResponse.json({ stats: [] });
    }

    // ------------------ Reports per user (JS aggregation; avoids group())
    const { data: reportRows, error: reportErr } = await service
      .from("user_reports")
      .select("reported_user_id")
      .in("reported_user_id", ids);

    if (reportErr) throw reportErr;

    const reportMap = new Map<string, number>();
    for (const r of reportRows || []) {
      const key = (r as any).reported_user_id as string;
      reportMap.set(key, (reportMap.get(key) || 0) + 1);
    }

    // ------------------ Adopted pets per owner (REAL adoptions)
    const { data: adoptedRows, error: adoptedErr } = await service
      .from("pets")
      .select("owner_id, status")
      .eq("status", "adopted")
      .in("owner_id", ids);

    if (adoptedErr) throw adoptedErr;

    const adoptedMap = new Map<string, number>();
    for (const r of adoptedRows || []) {
      const key = (r as any).owner_id as string;
      adoptedMap.set(key, (adoptedMap.get(key) || 0) + 1);
    }

    // ------------------ Normalize to requested IDs
    const stats = ids.map((id) => ({
      id,
      reports_count: reportMap.get(id) ?? 0,
      adopted_pets_count: adoptedMap.get(id) ?? 0,
    }));

    return NextResponse.json({ stats });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to load stats" },
      { status: 500 }
    );
  }
}
