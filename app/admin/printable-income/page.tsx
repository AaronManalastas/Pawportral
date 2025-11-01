// app/admin/printable-income/page.tsx
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import PrintableIncomeClient from "./PrintableIncomeClient";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export default async function PrintableIncomePage() {
  // 1) user check
  const supa = getSupabaseServerClient();
  const {
    data: { user },
  } = await supa.auth.getUser();
  if (!user) {
    redirect("/sign-in?next=/admin/printable-income");
  }

  // 2) service-role client
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // 3) get all payment_proofs
  const { data: payments, error } = await admin
    .from("payment_proofs")
    .select("id, user_id, amount, reference, status, created_at")
    .order("created_at", { ascending: false });

  // 4) approved only
  const approved = (payments ?? []).filter(
    (p) => (p.status ?? "").toLowerCase() === "approved"
  );

  // 5) collect user_ids
  const userIds = Array.from(
    new Set(approved.map((p) => p.user_id).filter(Boolean))
  ) as string[];

  // 6) get emails from auth.users
  let emailMap = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: authUsers } = await admin
      .from("auth.users")
      .select("id, email")
      .in("id", userIds);

    emailMap = new Map(
      (authUsers ?? []).map((u: any) => [u.id as string, u.email as string])
    );
  }

  // 6.1) get names from profiles
  let nameMap = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profileRows } = await admin
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);

    nameMap = new Map(
      (profileRows ?? [])
        .filter((p: any) => p.full_name && p.full_name.trim() !== "")
        .map((p: any) => [p.id as string, p.full_name as string])
    );
  }

  // 7) build rows
  const rows = approved.map((p: any) => {
    const userId = (p.user_id as string) ?? null;

    const fromProfiles =
      userId && nameMap.get(userId) ? (nameMap.get(userId) as string) : null;

    const fromAuthEmail =
      userId && emailMap.get(userId)
        ? (emailMap.get(userId) as string)
        : userId
        ? userId.slice(0, 6) + "…"
        : "Unknown";

    return {
      id: p.id as string,
      created_at: p.created_at as string,
      amount: Number(p.amount ?? 0),
      reference: (p.reference as string) ?? null,
      user_id: userId,
      status: (p.status as string) ?? null,
      user_email: fromAuthEmail,
      user_name: fromProfiles,
    };
  });

  return (
    <PrintableIncomeClient
      initialRows={rows}
      errorMsg={error ? error.message : ""}
    />
  );
}
