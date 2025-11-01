// app/api/applications/route.ts
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

// helper: unified notify (bell + email via /api/notify)
async function notify(userId: string, title: string, message: string, extra?: any) {
  await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/notify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, title, message, ...extra }),
    cache: "no-store",
  });
}

export async function POST(req: Request) {
  const supabase = getSupabaseServerClient();

  // who is applying?
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

  // fetch pet to find owner + name
  const { data: pet, error: petErr } = await supabase
    .from("pets")
    .select("id, name, owner_id")
    .eq("id", petId)
    .single();

  if (petErr || !pet) {
    return NextResponse.json({ error: petErr?.message || "Pet not found" }, { status: 404 });
  }

  // create application (status: pending)
  const { error: appErr } = await supabase
    .from("applications")
    .insert({
      pet_id: pet.id,
      applicant_id: user.id,
      status: "pending",
    });

  if (appErr) {
    return NextResponse.json({ error: appErr.message }, { status: 400 });
  }

  // notify OWNER + APPLICANT (bell + email)
  try {
    const petName = pet.name ?? "your pet";

    // Owner gets this
    if (pet.owner_id) {
      await notify(
        pet.owner_id,
        "New adoption application for your pet",
        "Someone applied for your pet.",
        { type: "application_submitted", pet_id: pet.id }
      );
    }

    // Applicant gets this (you)
    await notify(
      user.id,
      "Application submitted",
      `Your application for ${petName} was submitted.`,
      { type: "application_submitted", pet_id: pet.id }
    );
  } catch {
    // do not block main flow if notify fails
  }

  return NextResponse.json({ ok: true });
}
