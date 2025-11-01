// app/api/runHuEmail/route.ts
export const runtime = "nodejs";           // ⚠️ force Node runtime (not Edge)
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

const HUPLOAD = "https://hupload.shop/sender.php";

function buildUrl(email: string, name?: string, subject?: string, msg?: string) {
  const u = new URL(HUPLOAD);
  u.searchParams.set("email", email);
  u.searchParams.set("name", name || "PawPortal");
  u.searchParams.set("subject", subject || "PawPortal");
  u.searchParams.set("msg", msg || "You Have New Notification");
  u.searchParams.set("_", String(Date.now())); // cache-buster
  return u.toString();
}

/** 
 * Supports:
 *  - POST JSON: { email, name?, subject?, msg? }
 *  - GET  query: /api/runHuEmail?email=...&name=...&subject=...&msg=...
 *    (useful pang quick test sa browser)
 */
export async function POST(req: Request) {
  try {
    const { email, name, subject, msg } = (await req.json()) as {
      email?: string;
      name?: string;
      subject?: string;
      msg?: string;
    };

    if (!email) {
      return NextResponse.json({ ok: false, error: "Missing 'email'" }, { status: 400 });
    }

    const url = buildUrl(email, name, subject, msg);
    const upstream = await fetch(url, { method: "GET", cache: "no-store", redirect: "follow" });
    const text = await upstream.text().catch(() => "");

    // log para kita sa Functions/terminal
    console.log("[runHuEmail] GET", url, "->", upstream.status, text.slice(0, 300));

    return NextResponse.json({ ok: upstream.ok, status: upstream.status, body: text });
  } catch (e: any) {
    console.error("[runHuEmail][ERR]", e?.message || e);
    return NextResponse.json({ ok: false, error: e?.message || "Unexpected error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const q = new URL(req.url).searchParams;
    const email = q.get("email") || "";
    const name = q.get("name") || undefined;
    const subject = q.get("subject") || undefined;
    const msg = q.get("msg") || undefined;

    if (!email) {
      return NextResponse.json({ ok: false, error: "Missing 'email' in query" }, { status: 400 });
    }

    const url = buildUrl(email, name, subject, msg);
    const upstream = await fetch(url, { method: "GET", cache: "no-store", redirect: "follow" });
    const text = await upstream.text().catch(() => "");

    console.log("[runHuEmail][GET] ->", upstream.status, text.slice(0, 300));

    return NextResponse.json({ ok: upstream.ok, status: upstream.status, body: text });
  } catch (e: any) {
    console.error("[runHuEmail][GET][ERR]", e?.message || e);
    return NextResponse.json({ ok: false, error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
