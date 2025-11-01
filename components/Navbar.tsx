"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  PawPrint, Shield, LogIn, LogOut, User2, Menu, X,
  Moon, SunMedium, User as UserIcon
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import NotificationBell from "@/components/NotificationBell";
import { useTheme } from "next-themes";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";

/** ───────────────── Types ───────────────── */
type Role = "user" | "admin" | "";

type Profile = {
  role: Role | null;
  full_name: string | null;
  avatar_url: string | null;
};

/** ───────────────── Component ───────────────── */
export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const { theme, setTheme } = useTheme();

  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [role, setRole] = useState<Role>("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarV, setAvatarV] = useState(0);

  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  /** ✅ Robust active-state helper (keeps "/" exact, allows subpaths for others) */
  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const pill =
    "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-white/40";
  const pillGhost = `${pill} text-white/90 hover:bg-white/10 hover:text-white`;
  const pillLight = `${pill} bg-white/10 text-white backdrop-blur border border-white/15 hover:bg-white/15`;
  const brand = "flex items-center gap-2 font-semibold text-white hover:opacity-95";

  const initials =
    (displayName?.split(" ").map((s) => s[0]).slice(0, 2).join("") ||
      user?.email?.[0] ||
      "U").toUpperCase();

  const avatarSrc = avatarUrl
    ? `${avatarUrl}${avatarUrl.includes("?") ? "&" : "?"}v=${avatarV}`
    : null;

  /** Load user + profile once, and listen to auth changes */
  useEffect(() => {
    let mounted = true;

    const loadUserAndProfile = async (): Promise<void> => {
      const { data: userRes } = await supabase.auth.getUser();
      const u = userRes?.user ?? null;
      if (!mounted) return;

      setUser(u);

      if (u) {
        const { data: profRow } = await supabase
          .from("profiles")
          .select("role, full_name, avatar_url")
          .eq("id", u.id)
          .single();

        const p = (profRow ?? null) as Profile | null;

        setDisplayName(p?.full_name ?? null);
        setRole((p?.role as Role | undefined) ?? "user");
        setAvatarUrl(p?.avatar_url ?? null);
      } else {
        setDisplayName(null);
        setRole("");
        setAvatarUrl(null);
      }
    };

    void loadUserAndProfile();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_evt: AuthChangeEvent, session: Session | null) => {
        const u = session?.user ?? null;
        setUser(u);

        if (u) {
          void (async () => {
            const { data: profRow } = await supabase
              .from("profiles")
              .select("role, full_name, avatar_url")
              .eq("id", u.id)
              .single();

            const p = (profRow ?? null) as Profile | null;

            setDisplayName(p?.full_name ?? null);
            setRole((p?.role as Role | undefined) ?? "user");
            setAvatarUrl(p?.avatar_url ?? null);
            setAvatarV((v) => v + 1);
          })();
        } else {
          setDisplayName(null);
          setRole("");
          setAvatarUrl(null);
        }

        router.refresh();
      }
    );

    // Refresh avatar after profile save (no-shadow-safe)
    const onStorage = async (e: StorageEvent) => {
      if (e.key !== "pp:avatarUpdated") return;

      const { data: userRes } = await supabase.auth.getUser();
      const currentUser = userRes?.user;
      if (!currentUser) return;

      const { data: avatarRow } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", currentUser.id)
        .single();

      const p = (avatarRow ?? null) as Pick<Profile, "avatar_url"> | null;
      setAvatarUrl(p?.avatar_url ?? null);
      setAvatarV((v) => v + 1);
    };

    window.addEventListener("storage", onStorage);

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe();
      window.removeEventListener("storage", onStorage);
    };
  }, [supabase, router]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  /** Robust logout: clear server + client, then hard reload (no manual refresh) */
  const handleSignOut = async (): Promise<void> => {
    try {
      await fetch("/auth/signout", { method: "POST", cache: "no-store" });
    } catch {}
    try {
      await supabase.auth.signOut();
    } catch {}

    setUser(null);
    setDisplayName(null);
    setRole("");
    setAvatarUrl(null);
    setOpen(false);
    setMenuOpen(false);

    window.location.replace("/");
  };

  /** 🔒 Admin visibility flag (used to hide regular nav) */
  const isAdmin = role === "admin";

  return (
    <nav className="sticky top-0 z-50 w-full bg-gradient-to-r from-violet-600 via-fuchsia-600 to-purple-600 shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)]">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex items-center justify-between py-3">
          {/* Brand */}
          <Link href="/" className={brand} onClick={() => setOpen(false)}>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/15 ring-1 ring-white/20">
              <PawPrint className="h-5 w-5 text-white" />
            </span>
            <span className="tracking-tight">PawPortal</span>
          </Link>

          {/* Desktop */}
          <div className="hidden items-center gap-2 md:flex">
            {/* Hide these links for ADMIN */}
            {!isAdmin && (
              <>
                {/* Home / About / Newsfeed */}
                <Link
                  href="/"
                  className={isActive("/") ? pillLight : pillGhost}
                  aria-current={isActive("/") ? "page" : undefined}
                >
                  Home
                </Link>

                {/* About link */}
                <Link
                  href="/about"
                  className={isActive("/about") ? pillLight : pillGhost}
                  aria-current={isActive("/about") ? "page" : undefined}
                >
                  About
                </Link>

                <Link
                  href="/newsfeed"
                  className={isActive("/newsfeed") ? pillLight : pillGhost}
                  aria-current={isActive("/newsfeed") ? "page" : undefined}
                >
                  Newsfeed
                </Link>

                <Link
                  href="/adopt"
                  className={isActive("/adopt") ? pillLight : pillGhost}
                  aria-current={isActive("/adopt") ? "page" : undefined}
                >
                  Adopt
                </Link>
              </>
            )}

            {user ? (
              <>
                {/* Hide Account button & Bell for ADMIN */}
                {!isAdmin && (
                  <>
                    <Link href="/dashboard" className={pillLight}>
                      <User2 className="h-4 w-4" />
                      Account
                    </Link>

                    <NotificationBell />
                  </>
                )}

                {role === "admin" && (
                  <Link
                    href="/admin"
                    className="inline-flex items-center gap-2 rounded-xl bg-white text-violet-700 px-3 py-2 text-sm font-semibold hover:bg-violet-50 shadow-sm"
                  >
                    <Shield className="h-4 w-4" />
                    Admin
                  </Link>
                )}

                {/* Avatar + menu (kept for all) */}
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setMenuOpen((v) => !v)}
                    aria-label="Open user menu"
                    className="inline-grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-white/20 text-white ring-1 ring-white/25 hover:bg-white/25"
                  >
                    {avatarSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={avatarSrc} src={avatarSrc} alt="" className="h-9 w-9 rounded-full object-cover" />
                    ) : (
                      <span className="text-[11px] font-bold">{initials}</span>
                    )}
                  </button>

                  <div
                    className={[
                      "absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-white/20 bg-white/95 text-gray-900 backdrop-blur shadow-xl",
                      "dark:border-white/10 dark:bg-neutral-900/95 dark:text-neutral-100",
                      menuOpen ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 -translate-y-1",
                      "transition",
                    ].join(" ")}
                  >
                    {/* Header */}
                    <div className="px-4 py-3 flex items-center gap-3">
                      <div className="h-9 w-9 overflow-hidden rounded-full ring-1 ring-black/5">
                        {avatarSrc ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={avatarSrc} alt="" className="h-9 w-9 object-cover" />
                        ) : (
                          <div className="grid h-9 w-9 place-items-center bg-gray-100 text-xs font-bold">
                            {initials}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">
                          {displayName ?? "Your account"}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Theme: <span className="capitalize">{theme}</span>
                        </div>
                      </div>
                    </div>

                    <div className="h-px bg-black/5 dark:bg-white/5" />

                    {/* Profile / Theme */}
                    <div className="px-2 py-2 text-sm">
                      <Link
                        href="/profile"
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-2 hover:bg-black/5 dark:hover:bg:white/5 dark:hover:bg-white/5"
                        onClick={() => setMenuOpen(false)}
                      >
                        <UserIcon className="h-4 w-4" />
                        Profile
                      </Link>

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

                    <div className="h-px bg-black/5 dark:bg:white/5 dark:bg-white/5" />

                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <Link
                href="/sign-in"
                className="inline-flex items-center gap-2 rounded-xl bg-white text-violet-700 px-3 py-2 text-sm font-semibold hover:bg-violet-50 shadow-sm"
              >
                <LogIn className="h-4 w-4" />
                Sign in
              </Link>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden inline-flex items-center justify-center rounded-lg p-2 text-white hover:bg-white/10"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle navigation menu"
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile sheet */}
        {open && (
          <div className="md:hidden pb-4">
            <div className="flex flex-col gap-2 border-t border-white/10 pt-3">
              {/* Hide these mobile links for ADMIN */}
              {!isAdmin && (
                <>
                  <Link href="/" className={isActive("/") ? pillLight : pillGhost} onClick={() => setOpen(false)}>
                    Home
                  </Link>

                  <Link href="/about" className={isActive("/about") ? pillLight : pillGhost} onClick={() => setOpen(false)}>
                    About
                  </Link>

                  <Link href="/newsfeed" className={isActive("/newsfeed") ? pillLight : pillGhost} onClick={() => setOpen(false)}>
                    Newsfeed
                  </Link>

                  <Link href="/adopt" className={isActive("/adopt") ? pillLight : pillGhost} onClick={() => setOpen(false)}>
                    Adopt
                  </Link>
                </>
              )}

              {user ? (
                <>
                  {/* Hide Dashboard/Profile/Bell for ADMIN */}
                  {!isAdmin && (
                    <>
                      <Link href="/dashboard" className={pillLight} onClick={() => setOpen(false)}>
                        <User2 className="h-4 w-4" />
                        Dashboard
                      </Link>

                      <Link href="/profile" className={pillLight} onClick={() => setOpen(false)}>
                        <UserIcon className="h-4 w-4" />
                        Profile
                      </Link>

                      <div className="px-1">
                        <NotificationBell />
                      </div>
                    </>
                  )}

                  {role === "admin" && (
                    <Link
                      href="/admin"
                      className="inline-flex items-center gap-2 rounded-xl bg-white text-violet-700 px-3 py-2 text-sm font-semibold hover:bg-violet-50 shadow-sm"
                      onClick={() => setOpen(false)}
                    >
                      <Shield className="h-4 w-4" />
                      Admin
                    </Link>
                  )}

                  <div className="mt-1 grid grid-cols-2 gap-2 px-1">
                    <button onClick={() => setTheme("dark")} className="rounded-lg bg-white/10 px-2 py-2 text-white">
                      Dark
                    </button>
                    <button onClick={() => setTheme("light")} className="rounded-lg bg-white/10 px-2 py-2 text-white">
                      Light
                    </button>
                  </div>

                  <button
                    onClick={async () => {
                      await handleSignOut();
                      setOpen(false);
                    }}
                    className={pillGhost}
                    title="Sign out"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </>
              ) : (
                <Link
                  href="/sign-in"
                  className="inline-flex items-center gap-2 rounded-xl bg-white text-violet-700 px-3 py-2 text-sm font-semibold hover:bg-violet-50 shadow-sm"
                  onClick={() => setOpen(false)}
                >
                  <LogIn className="h-4 w-4" />
                  Sign in
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
