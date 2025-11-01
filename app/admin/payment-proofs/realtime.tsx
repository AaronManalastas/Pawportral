// app/admin/payment-proofs/realtime.tsx
"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";

/**
 * Live updates for payment_proofs.
 * - Subscribes to Supabase Realtime (INSERT/UPDATE/DELETE)
 * - Polls every 3s as a fallback
 * - Refreshes when tab regains focus
 */
export default function PaymentProofsRealtime() {
  const supabase = getSupabaseBrowserClient();
  const router = useRouter();
  const qs = useSearchParams();

  useEffect(() => {
    let pollId: ReturnType<typeof setInterval> | undefined;
    let debounce: ReturnType<typeof setTimeout> | undefined;

    const triggerRefresh = () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        router.refresh();
      }, 150); // debounce rapid events
    };

    // Realtime
    const channel = supabase
      .channel("pp-payment-proofs")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payment_proofs" },
        () => triggerRefresh()
      )
      .subscribe();

    // Polling fallback (every 3s)
    pollId = setInterval(() => {
      router.refresh();
    }, 3000);

    // Refresh when user focuses the tab
    const onFocus = () => router.refresh();
    const onVis = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      if (pollId) clearInterval(pollId);
      if (debounce) clearTimeout(debounce);
      supabase.removeChannel(channel);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
    // include search params so switching pages keeps the subscription active per page
  }, [supabase, router, qs?.toString()]);

  return null;
}
