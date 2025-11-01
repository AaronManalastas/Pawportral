import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  try {
    const { ids, updates } = await req.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ message: "No ids provided" }, { status: 400 });
    }
    if (!updates || typeof updates !== "object") {
      return NextResponse.json({ message: "No updates provided" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // Map the client field names to DB columns if they differ
    // Here we assume columns: name, type, breed, age_months, status
    const { error } = await supabase
      .from("pets")
      .update(updates)
      .in("id", ids);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message || "Failed to update" },
      { status: 500 }
    );
  }
}
