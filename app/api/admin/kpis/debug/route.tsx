import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    const supabase = getSupabaseServerClient();

    const [petsCnt, appsCnt, profCnt, kpi] = await Promise.all([
      supabase.from("pets").select("id", { count: "exact", head: true }),
      supabase.from("applications").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.rpc("admin_dashboard_kpis").single(),
    ]);

    return NextResponse.json({
      env_url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
      counts: {
        pets: petsCnt.count ?? null,
        applications: appsCnt.count ?? null,
        profiles: profCnt.count ?? null,
      },
      rpc: {
        data: kpi.data ?? null,
        error: kpi.error?.message ?? null,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { fatal: e?.message ?? "Unhandled error" },
      { status: 500 }
    );
  }
}
