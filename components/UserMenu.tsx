"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { LogOut, Moon, SunMedium, Monitor } from "lucide-react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";

type Props = {
  avatarUrl?: string | null;
  initials?: string;     // e.g. "AR"
  fullName?: string;     // optional subtitle
};

export default function UserMenu({ avatarUrl, initials = "U", fullName }: Props) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [open, setOpen] = React.useState(false);
  const supabase = createClientComponentClient();
  const router = useRouter();
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function signOut() {
    try {
      await supabase.auth.signOut();
      router.push("/sign-in");
      router.refresh();
    } catch {}
  }

  return (
    <div ref={menuRef} className="relative">
      {/* Avatar Button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-grid h-9 w-9 place-items-center overflow-hidden rounded-full ring-1 ring-black/10 bg-white dark:bg-neutral-800 dark:ring-white/10 shadow-sm"
        aria-label="Open user menu"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
        ) : (
          <span className="text-[11px] font-bold text-gray-800 dark:text-neutral-100">
            {initials}
          </span>
        )}
      </button>

      {/* Dropdown */}
      <div
        className={[
          "absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-black/10 bg-white/95 backdrop-blur shadow-xl dark:border-white/10 dark:bg-neutral-900/95",
          open ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 -translate-y-1",
          "transition"
        ].join(" ")}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-gray-100 ring-1 ring-black/10 dark:bg-neutral-800 dark:ring-white/10">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <span className="text-[11px] font-bold text-gray-800 dark:text-neutral-100">
                {initials}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">
              {fullName || "Your account"}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Theme
              <span className="ml-1 font-medium capitalize">
                {(theme === "system" ? `${resolvedTheme} (system)` : theme) || "system"}
              </span>
            </div>
          </div>
        </div>

        <div className="h-px bg-black/5 dark:bg-white/5" />

        {/* Theme Switcher */}
        <div className="px-2 py-2 text-sm">
          <button
            onClick={() => setTheme("system")}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 hover:bg-black/5 dark:hover:bg-white/5"
          >
            <Monitor className="h-4 w-4" />
            System
          </button>
          <button
            onClick={() => setTheme("dark")}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 hover:bg-black/5 dark:hover:bg-white/5"
          >
            <Moon className="h-4 w-4" />
            Dark
          </button>
          <button
            onClick={() => setTheme("light")}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 hover:bg-black/5 dark:hover:bg-white/5"
          >
            <SunMedium className="h-4 w-4" />
            Light
          </button>
        </div>

        <div className="h-px bg-black/5 dark:bg-white/5" />

        {/* Logout */}
        <button
          onClick={signOut}
          className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-black/5 dark:hover:bg-white/5"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </div>
  );
}
