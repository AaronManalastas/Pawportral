// app/api/pets/mark-adopted/route.tsx
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { sendGenericEmail } from "@/lib/sendGenericEmail"; // 👈 ADD

export async function POST(req: Request) {
  const supabase = getSupabaseServerClient();

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { petId } = await req.json().catch(() => ({}));
  if (!petId) {
    return NextResponse.json({ error: "petId is required" }, { status: 400 });
  }

  // verify ownership
  const { data: pet, error: fetchErr } = await supabase
    .from("pets")
    .select("id, owner_id, status")
    .eq("id", petId)
    .single();

  if (fetchErr || !pet) {
    return NextResponse.json({ error: "Pet not found" }, { status: 404 });
  }
  if (pet.owner_id !== user.id) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }
  if ((pet.status || "").toLowerCase() === "adopted") {
    // idempotent success
    // Optional: still send email if you want on repeated calls
    await sendGenericEmail(); // (you can remove this line if you don't want duplicate emails)
    return NextResponse.json({ ok: true });
  }

  // set status only (no adopted_at field)
  const { error: upErr } = await supabase
    .from("pets")
    .update({ status: "adopted" })
    .eq("id", petId)
    .eq("owner_id", user.id);

  if (upErr) {
    const msg = (upErr as any)?.message || "";
    if (msg.includes("pets_status_check")) {
      return NextResponse.json(
        { error: "Check constraint blocked this update.", code: "PETS_STATUS_CHECK" },
        { status: 422 }
      );
    }
  }

  // ✅ SEND GENERIC EMAIL (fixed message) AFTER SUCCESS
  await sendGenericEmail();

  return NextResponse.json({ ok: true });
}
