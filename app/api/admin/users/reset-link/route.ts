// app/api/admin/users/reset-link/route.ts
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  // 1) still check admin
  await requireAdmin();

  const { userId } = await req.json();
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  // 2) real service-role client (kailangan naka-set sa Vercel env):
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // 3) kunin muna yung user para makuha email
  const { data: userData, error: getErr } = await admin.auth.admin.getUserById(
    userId
  );
  if (getErr) {
    return NextResponse.json({ error: getErr.message }, { status: 500 });
  }

  const email = userData.user?.email;
  if (!email) {
    return NextResponse.json(
      { error: "User has no email, cannot create recovery link." },
      { status: 400 }
    );
  }

  // 4) generate reset/recovery link gamit email (not user_id)
  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const url =
    (data as any)?.properties?.action_link ??
    (data as any)?.properties?.redirect_to ??
    null;

  return NextResponse.json({ url });
}
