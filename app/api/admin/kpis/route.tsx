import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireAdmin();
  const supabase = getSupabaseServerClient();

  const [kpiRes, weeklyRes, statusRes, breedsRes] = await Promise.all([
    supabase.rpc("admin_dashboard_kpis").single(),
    supabase.rpc("admin_chart_weekly_users", { _weeks: 8 }),
    supabase.rpc("admin_chart_app_status"),
    supabase.rpc("admin_chart_top_breeds", { _limit: 10 }),
  ]);

  if (kpiRes.error || weeklyRes.error || statusRes.error || breedsRes.error) {
    return NextResponse.json(
      {
        error: {
          kpis: kpiRes.error?.message,
          weekly: weeklyRes.error?.message,
          appStatus: statusRes.error?.message,
          topBreeds: breedsRes.error?.message,
        },
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    kpis: kpiRes.data ?? { total_pets: 0, available_pets: 0, pending_apps: 0, approval_rate: 0, active_owners: 0 },
    weekly: weeklyRes.data ?? [],
    appStatus: statusRes.data ?? [],
    topBreeds: breedsRes.data ?? [],
  });
}
