// app/api/pets/route.ts
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("pets").select("*").eq("id", id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ pet: data });
}

// PATCH body: { id, values: { name?, type?, breed?, age_months?, status? } }
export async function PATCH(req: Request) {
  const supabase = getSupabaseServerClient();
  const body = await req.json();
  const id = body?.id as string | undefined;
  const values = body?.values ?? {};
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // Load row to detect existing columns
  const { data: row, error: rowErr } = await supabase.from("pets").select("*").eq("id", id).single();
  if (rowErr || !row) {
    return NextResponse.json({ error: rowErr?.message || "Pet not found" }, { status: 404 });
  }

  const has = (k: string) => Object.prototype.hasOwnProperty.call(row, k);

  // Build safe updates (only keys that exist on this row/DB)
  const updates: Record<string, any> = {};

  if (values.name !== undefined && has("name")) updates.name = values.name;
  if (values.breed !== undefined && has("breed")) updates.breed = values.breed;

  if (values.type !== undefined) {
    for (const k of ["type", "pet_type", "species", "category"]) {
      if (has(k)) {
        updates[k] = values.type;
        break;
      }
    }
  }

  if (values.status !== undefined && has("status")) {
    updates.status = values.status;
  }

  if (values.age_months !== undefined) {
    for (const k of ["age_months", "ageMonths", "age_in_months", "age"]) {
      if (has(k)) {
        updates[k] = values.age_months;
        break;
      }
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updatable fields on this row" }, { status: 400 });
  }

  const { data: updated, error: upErr } = await supabase
    .from("pets")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
  return NextResponse.json({ ok: true, pet: updated });
}

/* Keep your existing DELETE handler here (unchanged) */
