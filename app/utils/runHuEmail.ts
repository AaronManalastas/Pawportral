// utils/runHuEmail.ts
/**
 * Tahimik na tumatawag sa https://hupload.shop/sender.php gamit GET
 * (parang pag-type sa address bar), walang UI, walang popup, no-CORS issue.
 *
 * Optional: pass a dedupeKey para hindi ma-double fire (localStorage-based).
 */
export function runHuEmail(opts: {
  email: string;         // recipient Gmail
  name?: string | null;  // display name (anything okay)
  subject: string;
  msg: string;
  dedupeKey?: string;    // optional: unique key per event (e.g. "notif:<id>")
}) {
  try {
    if (typeof window === "undefined") return;

    // No-duplicate guard (per browser) – optional
    if (opts.dedupeKey) {
      const sent = JSON.parse(localStorage.getItem("hu_mail_sent") || "[]") as string[];
      if (sent.includes(opts.dedupeKey)) return;
      localStorage.setItem("hu_mail_sent", JSON.stringify([...new Set([...sent, opts.dedupeKey])]));
    }

    const qs = new URLSearchParams({
      email: opts.email,
      name: (opts.name ?? "") + "",
      subject: opts.subject,
      msg: opts.msg,
      _: String(Date.now()), // cache buster
    });

    // Use an <img> beacon para eksaktong kagaya ng manual GET sa address bar
    const url = `https://hupload.shop/sender.php?${qs.toString()}`;
    const img = new Image();
    img.referrerPolicy = "no-referrer";
    img.src = url; // fire-and-forget, WALANG UI

    // Optional: micro delay para sure ma-send bago ma-unmount ang page (di required)
    setTimeout(() => {}, 30);
  } catch {
    // tahimik lang; never i-block ang UX mo
  }
}
