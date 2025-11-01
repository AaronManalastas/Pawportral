// app/api/email/notify/route.ts
import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const HUPLOAD_BASE = "https://hupload.shop/sender.php";

function buildHuploadUrl(params: { email: string; name?: string; subject?: string; msg?: string }) {
  const url = new URL(HUPLOAD_BASE);
  url.searchParams.set("email", params.email);
  url.searchParams.set("name", params.name ?? "PawPortal");
  url.searchParams.set("subject", params.subject ?? "PawPortal Notification");
  url.searchParams.set("msg", params.msg ?? "You have a new notification.");
  url.searchParams.set("_", String(Date.now())); // cache-buster
  return url.toString();
}

async function sendViaHupload(email: string, name?: string, subject?: string, msg?: string) {
  const url = buildHuploadUrl({ email, name, subject, msg });
  const upstream = await fetch(url, { method: "GET" });
  const text = await upstream.text().catch(() => "");
  return { ok: upstream.ok, status: upstream.status, body: text };
}

function getAdminClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

async function getUserEmailById(userId: string) {
  const admin = getAdminClient();
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error) throw error;
  return data.user?.email ?? null;
}

/**
 * POST modes:
 * 1) Direct: { email, name?, subject?, msg? }
 * 2) Webhook (X-Webhook-Secret===EMAIL_NOTIFY_SECRET):
 *    { type, table, record: { user_id?, email?, title?, body?, name?, subject?, msg? } }
 */
export async function POST(req: Request) {
  try {
    const secretFromHeader = req.headers.get("x-webhook-secret") || "";
    const expectedSecret = process.env.EMAIL_NOTIFY_SECRET || "";
    const body = await req.json().catch(() => ({} as any));
    const isWebhook = typeof body?.record === "object" && !!body?.table && !!body?.type;

    if (isWebhook) {
      if (!expectedSecret || secretFromHeader !== expectedSecret) {
        return NextResponse.json({ ok: false, error: "Forbidden: bad webhook secret" }, { status: 403 });
      }

      const record = body.record as {
        user_id?: string;
        email?: string | null;
        title?: string | null;
        body?: string | null;
        name?: string | null;
        subject?: string | null;
        msg?: string | null;
      };

      let targetEmail = record.email ?? null;
      if (!targetEmail) {
        if (!record.user_id) {
          return NextResponse.json({ ok: false, error: "No user_id or email on record" }, { status: 400 });
        }
        targetEmail = await getUserEmailById(record.user_id);
      }
      if (!targetEmail) {
        return NextResponse.json({ ok: false, error: "Target email not found" }, { status: 404 });
      }

      const name = record.name ?? "PawPortal";
      const subject = record.subject ?? record.title ?? "PawPortal Notification";
      const msg = record.msg ?? record.body ?? "You have a new notification.";
      const res = await sendViaHupload(targetEmail, name, subject, msg);
      return NextResponse.json({ mode: "webhook", ...res }, { status: res.status });
    }

    // Direct mode
    const { email, name, subject, msg } = body as {
      email?: string;
      name?: string;
      subject?: string;
      msg?: string;
    };
    if (!email) {
      return NextResponse.json({ ok: false, error: "Missing 'email' in body" }, { status: 400 });
    }
    const res = await sendViaHupload(email, name, subject, msg);
    return NextResponse.json({ mode: "direct", ...res }, { status: res.status });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Unexpected error" }, { status: 500 });
  }
}
