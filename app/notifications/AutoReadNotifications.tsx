// app/notifications/AutoReadNotifications.tsx
"use client";

import { useEffect } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";

export default function AutoReadNotifications() {
  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (!user) return;

      // mark all unread as read
      await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .is("read_at", null)
        .eq("user_id", user.id);
      // NotificationBell listens to updates and will recompute automatically.
    })();
  }, [supabase]);

  return null;
}
