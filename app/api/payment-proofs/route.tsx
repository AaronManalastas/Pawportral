// app/api/payment-proofs/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function getUserClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // service role for storage
  );
}

const BUCKET = "payment-proofs";
// const FIXED_PRICE = 20;  // ← hindi na natin gagamitin for insert
const ALLOWED_AMOUNTS = [20, 40, 60, 80, 100] as const;

export async function GET() {
  const supa = getUserClient();
  const {
    data: { user },
  } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data, error } = await supa
    .from("payment_proofs")
    .select("*")
    .eq("user_id", user.id)
    .neq("status", "approved") // <-- huwag isama ang approved sa list ng user
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const form = await req.formData();

  // Accept "file" (from the component), but also tolerate "image"/"screenshot"
  const uploaded =
    (form.get("file") ||
      form.get("image") ||
      form.get("screenshot")) as File | null;

  if (!uploaded || typeof uploaded === "string" || uploaded.size === 0) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const reference = (form.get("reference") || "") as string;

  // ✅ NEW: read amount from form
  const amountRaw = form.get("amount");
  const parsed = Number(String(amountRaw || "").trim());
  let amount = Number.isFinite(parsed) ? parsed : 20;
  // snap to 20/40/60/80/100
  if (!ALLOWED_AMOUNTS.includes(amount as any)) {
    amount = 20;
  }

  const supa = getUserClient();
  const {
    data: { user },
  } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // Upload to storage via service role (avoids storage RLS issues)
  const admin = getAdminClient();
  const safeName = uploaded.name.replace(/\s+/g, "_");
  const path = `proofs/${user.id}/${Date.now()}-${safeName}`;

  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(path, uploaded, {
      contentType: uploaded.type || "image/png",
      upsert: false,
    });

  if (upErr) {
    return NextResponse.json(
      { error: `Upload failed: ${upErr.message}` },
      { status: 400 }
    );
  }

  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
  const imageUrl = pub?.publicUrl || "";

  // ✅ FIX: use the amount we just parsed (NOT fixed 20)
  const { error: insErr } = await supa.from("payment_proofs").insert({
    user_id: user.id,
    image_url: imageUrl,
    amount: amount, // ← ito na: 20/40/60/80/100
    reference: reference || null,
    status: "pending",
  });

  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

/* ---------------------------- DELETE (new) ---------------------------- */
/** convert a public URL back to the storage object path */
function storagePathFromPublicUrl(url: string | null | undefined) {
  if (!url) return null;
  // Example public URL:
  // https://<proj>.supabase.co/storage/v1/object/public/payment-proofs/proofs/<userId>/<file>
  const marker = `/object/public/${BUCKET}/`;
  const i = url.indexOf(marker);
  if (i === -1) return null;
  return url.substring(i + marker.length); // -> "proofs/<userId>/<file>"
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    // Must be signed in
    const supa = getUserClient();
    const {
      data: { user },
    } = await supa.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    // Use service role to read & delete; still enforce ownership + rejected
    const admin = getAdminClient();

    // Fetch the row
    const { data: row, error: fetchErr } = await admin
      .from("payment_proofs")
      .select("id,user_id,status,image_url")
      .eq("id", id)
      .single();

    if (fetchErr || !row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Only the owner can delete, and only if it's rejected
    if (row.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if ((row.status || "").toLowerCase() !== "rejected") {
      return NextResponse.json(
        { error: "Only rejected proofs can be removed" },
        { status: 400 }
      );
    }

    // Remove storage object (best-effort)
    const objectPath = storagePathFromPublicUrl(row.image_url);
    if (objectPath) {
      await admin.storage.from(BUCKET).remove([objectPath]).catch(() => {});
    }

    // Delete DB row
    const { error: delErr } = await admin
      .from("payment_proofs")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
      .eq("status", "rejected");

    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
