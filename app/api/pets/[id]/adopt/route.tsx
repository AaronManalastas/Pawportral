// app/api/pets/[id]/adopt/route.ts
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";
import { sendGenericEmail } from "@/lib/sendGenericEmail"; // 👈 ADD

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabaseServerClient();

  // who’s acting?
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const petId = params.id;

  // ensure it’s the owner’s pet
  const { data: pet, error: fetchErr } = await supabase
    .from("pets")
    .select("id, owner_id, status")
    .eq("id", petId)
    .single();

  if (fetchErr || !pet) {
    return NextResponse.json(
      { error: fetchErr?.message || "Pet not found." },
      { status: 404 }
    );
  }
  if (pet.owner_id !== user.id) {
    return NextResponse.json(
      { error: "You can only modify your own pets." },
      { status: 403 }
    );
  }

  // mark as adopted (only if not already)
  const { error: updateErr } = await supabase
    .from("pets")
    .update({ status: "adopted" })
    .eq("id", petId)
    .eq("owner_id", user.id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 400 });
  }

  // refresh pages that show pet lists
  revalidatePath("/adopt");
  revalidatePath("/dashboard");

  // ✅ SEND GENERIC EMAIL (fixed message) AFTER SUCCESS
  await sendGenericEmail();

  return NextResponse.json({ ok: true });
}
