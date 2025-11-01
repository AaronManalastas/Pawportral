// app/api/profile/avatar/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: Request) {
  try {
    // who’s uploading?
    const cookieStore = cookies();
    const auth = createServerClient(URL, ANON, {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: () => {},
        remove: () => {},
      },
    });
    const { data: authData, error: authErr } = await auth.auth.getUser();
    if (authErr || !authData?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const userId = authData.user.id;

    // read file
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${userId}/${Date.now()}.${ext}`;

    // upload with service role (bypasses RLS safely on server)
    const service = createClient(URL, SERVICE);
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: upErr } = await service.storage
      .from("avatars")
      .upload(path, buffer, {
        upsert: true,
        contentType: file.type || "image/jpeg",
        cacheControl: "3600",
      });
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });

    // ✅ signed URL (1 year) — works for private buckets too
    const { data: signed, error: signErr } = await service
      .storage.from("avatars")
      .createSignedUrl(path, 60 * 60 * 24 * 365);
    if (signErr || !signed?.signedUrl) {
      return NextResponse.json({ error: signErr?.message || "No URL" }, { status: 400 });
    }

    const url = signed.signedUrl;

    // save on profile (you can also store the path if you want)
    const { error: upsertErr } = await service
      .from("profiles")
      .upsert({ id: userId, avatar_url: url }, { onConflict: "id" });
    if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 400 });

    return NextResponse.json({ url }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Upload failed" }, { status: 500 });
  }
}
