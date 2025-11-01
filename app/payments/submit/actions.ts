"use server";

import { createClient as createAdmin } from "@supabase/supabase-js";

const ALLOWED_AMOUNTS = [20, 40, 60, 80, 100];

function admin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

/**
 * Called by user form when submitting payment proof
 */
export async function submitPaymentProof(formData: FormData) {
  const userId = String(formData.get("user_id") || "");
  const rawAmount = String(formData.get("amount") || "");
  const reference = String(formData.get("reference") || "");
  const imageUrl = String(formData.get("image_url") || "");

  if (!userId) {
    throw new Error("Missing user_id");
  }

  // parse e.g. "40" or "40.00" → 40
  const parsed = Number(rawAmount);
  const amount = Number.isFinite(parsed) ? parsed : 0;

  // allow only 20,40,60,80,100
  const finalAmount = ALLOWED_AMOUNTS.includes(amount) ? amount : 20;

  const db = admin();

  const { error } = await db.from("payment_proofs").insert({
    user_id: userId,
    amount: finalAmount, // ← ito na ang masi-save; 40 kung 40 pinili
    reference,
    image_url: imageUrl,
    status: "pending",
  });

  if (error) {
    console.error("submitPaymentProof error", error);
    throw new Error("Failed to submit payment proof");
  }
}
