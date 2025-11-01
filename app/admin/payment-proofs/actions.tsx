"use server";

import { revalidatePath } from "next/cache";
import { createClient as createAdmin } from "@supabase/supabase-js";

function admin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

/**
 * Approve a payment proof.
 * 20 = 1 credit, 40 = 2, etc.
 * Uses BOTH:
 *  - amount saved in payment_proofs
 *  - count sent by admin page (hidden input)
 * then takes the bigger one, then caps to 5/week
 */
export async function approve(formData: FormData) {
  const id = String(formData.get("id") || "");
  const userProvidedCount = Number(formData.get("count") || 0);
  const userIdFromForm = String(formData.get("user_id") || "");

  if (!id) return;

  const db = admin();

  // 1) get proof from DB
  const { data: proof, error: proofErr } = await db
    .from("payment_proofs")
    .select("id, user_id, amount, status, created_at, credits_granted")
    .eq("id", id)
    .single();

  if (proofErr || !proof || proof.status !== "pending") {
    revalidatePath("/admin/payment-proofs");
    return;
  }

  const userId = proof.user_id || userIdFromForm;

  // compute from DB amount
  const rawAmount = Number(proof.amount || 0);
  const fromAmount = Math.max(0, Math.floor(rawAmount / 20)); // 20 → 1, 40 → 2

  // ✅ take whichever is bigger: UI’s count or DB compute
  let want = Math.max(fromAmount, userProvidedCount);

  if (want <= 0) {
    // no credits to give
    await db
      .from("payment_proofs")
      .update({ status: "rejected" })
      .eq("id", id);
    revalidatePath("/admin/payment-proofs");
    return;
  }

  // 2) apply weekly cap (max 5)
  let already = 0;
  const { data: rpcData } = await db.rpc("sum_credits_this_week", {
    p_user_id: userId,
  });
  if (typeof rpcData === "number") {
    already = rpcData;
  } else if (Array.isArray(rpcData) && rpcData.length) {
    already = Number(rpcData[0]?.sum ?? 0);
  }

  const CAP = 5;
  const remaining = Math.max(0, CAP - already);
  const grant = Math.min(want, remaining);

  if (grant <= 0) {
    await db
      .from("payment_proofs")
      .update({ status: "rejected" })
      .eq("id", id);
    revalidatePath("/admin/payment-proofs");
    return;
  }

  // 3) add to profile
  const { data: prof } = await db
    .from("profiles")
    .select("listing_credits")
    .eq("id", userId)
    .single();

  const nextCredits = Number(prof?.listing_credits || 0) + grant;

  await db
    .from("profiles")
    .update({ listing_credits: nextCredits })
    .eq("id", userId);

  // 4) mark approved and save how many credits were given
  await db
    .from("payment_proofs")
    .update({
      status: "approved",
      credits_granted: grant,
    })
    .eq("id", id);

  revalidatePath("/admin/payment-proofs");
}

/** Reject a proof (no credits granted). */
export async function reject(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) return;

  const db = admin();
  await db
    .from("payment_proofs")
    .update({ status: "rejected", credits_granted: 0 })
    .eq("id", id);
  revalidatePath("/admin/payment-proofs");
}
