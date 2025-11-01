import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  await requireAdmin();
  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  const supabase = getSupabaseServerClient();
  // If you have access to Admin API via service key on the server, you can create a reset link.
  // Supabase JS v2 admin methods: supabase.auth.admin.generateLink()
  // Ensure this code runs only on the server with service role privileges.
  // @ts-ignore
  if (!supabase.auth.admin) return NextResponse.json({ error: "Admin API not available" }, { status: 500 });

  // @ts-ignore
  const { data, error } = await supabase.auth.admin.generateLink({
    type: "recovery",
    user_id: userId,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ url: data?.properties?.action_link || null });
}
