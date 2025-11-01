// app/notifications/page.tsx
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import AutoReadNotifications from "./AutoReadNotifications";

// Icons
import {
  CheckCircle2,
  XCircle,
  UserPlus2,
  Trash2,
  X,
  PawPrint,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const dynamic = "force-dynamic";

/* ───────────────── Server actions ───────────────── */

export async function deleteNotification(formData: FormData) {
  "use server";
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/notifications");

  const notifId = String(formData.get("notif_id") || "");
  if (!notifId) return;

  await supabase
    .from("notifications")
    .delete()
    .eq("id", notifId)
    .eq("user_id", user.id);

  revalidatePath("/notifications");
}

export async function deleteAllNotifications() {
  "use server";
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/notifications");

  await supabase.from("notifications").delete().eq("user_id", user.id);
  revalidatePath("/notifications");
}

/* ───────────────── Page ───────────────── */

export default async function NotificationsPage() {
  const supabase = getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/notifications");

  // Load notifications
  const { data: notifs, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(150);

  // Optional: fetch pet thumbs for nicer visuals
  const petIds = Array.from(
    new Set(
      (notifs ?? [])
        .map(
          (n: any) => n?.data?.pet_id ?? n?.data?.petId ?? n?.data?.pet?.id
        )
        .filter(Boolean)
    )
  ) as string[];

  const petMap: Record<
    string,
    { name?: string | null; photo_url?: string | null }
  > = {};

  if (petIds.length) {
    const { data: pets } = await supabase
      .from("pets")
      .select("id, name, photo_url")
      .in("id", petIds);
    for (const p of pets ?? []) {
      petMap[p.id] = { name: p.name, photo_url: p.photo_url };
    }
  }

  // Group by day for “Today / Yesterday / …”
  const groups = groupByDay((notifs ?? []) as any[]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      {/* Marks unread as read on mount so the bell count drops immediately */}
      <AutoReadNotifications />

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Notifications</h1>

        <form action={deleteAllNotifications}>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:text-gray-900"
            title="Delete all notifications"
          >
            <Trash2 className="h-4 w-4" />
            Delete all
          </button>
        </form>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
          Error loading notifications: {error.message}
        </div>
      )}

      {!groups || groups.length === 0 ? (
        <Empty />
      ) : (
        <div className="space-y-10">
          {groups.map(({ label, items }) => (
            <section key={label} className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                {label}
              </h2>
              <div className="space-y-3">
                {items.map((n: any) => (
                  <NotifCard key={n.id} n={n} petMap={petMap} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}

/* ───────────────── Components ───────────────── */

function NotifCard({
  n,
  petMap,
}: {
  n: any;
  petMap: Record<string, { name?: string | null; photo_url?: string | null }>;
}) {
  const created = n.created_at ? new Date(n.created_at) : null;
  const unread = !n.read_at;

  const petId: string | undefined =
    n?.data?.pet_id ?? n?.data?.petId ?? n?.data?.pet?.id ?? undefined;

  const petNameFromData: string | undefined =
    n?.data?.pet_name ?? n?.data?.petName ?? n?.data?.pet?.name ?? undefined;

  const petMeta = petId ? petMap[petId] : undefined;
  const petName = petMeta?.name ?? petNameFromData;

  // thumb
  const thumb = petMeta?.photo_url;

  // delete button (top-right)
  const DeleteX = (
    <form action={deleteNotification}>
      <input type="hidden" name="notif_id" value={n.id} />
      <button
        type="submit"
        className="group rounded-full p-1.5 text-gray-500 ring-1 ring-transparent transition-all hover:bg-white hover:text-rose-700 hover:ring-rose-200"
        title="Delete notification"
        aria-label="Delete notification"
      >
        <X className="h-4 w-4 transition-transform group-hover:scale-110" />
        <span className="sr-only">Delete</span>
      </button>
    </form>
  );

  // Choose icon/accent by type
  const { Icon, accent } = iconForType(n.type);

  return (
    <div
      className={[
        "relative grid grid-cols-[auto_1fr_auto] items-start gap-4 rounded-2xl border bg-white p-4 shadow-sm transition-all hover:shadow-md",
        unread ? "ring-2 ring-indigo-200 bg-indigo-50/60" : "",
      ].join(" ")}
    >
      {/* Accent icon */}
      <div
        className={`mt-1 grid h-9 w-9 place-items-center rounded-full ${accent.bg}`}
        aria-hidden
      >
        <Icon className={`h-5 w-5 ${accent.fg}`} />
      </div>

      {/* Content */}
      <div className="min-w-0">
        <div className="flex items-start gap-3">
          {thumb ? (
            // Pet thumbnail (if available)
            <div className="mt-0.5 h-9 w-12 overflow-hidden rounded-md border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumb}
                alt={petName ?? "Pet"}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="mt-0.5 grid h-9 w-12 place-items-center rounded-md border bg-gray-50 text-lg">
              <PawPrint className="h-4 w-4 text-gray-400" />
            </div>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate font-medium">
                {renderTitle(n.type, petName)}
              </p>
              {unread && (
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-white/90" />
                  New
                </span>
              )}
            </div>

            <p className="mt-0.5 text-sm text-gray-600">
              {renderSubtitle(n.type)}
              {created ? ` • ${formatWhen(created)}` : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-start gap-2">
        {renderActions(n, petId)}
        {DeleteX}
      </div>
    </div>
  );
}

function renderTitle(type: string, petName?: string) {
  switch (type) {
    case "application.created":
      return `New adoption application${petName ? ` for ${petName}` : ""}`;
    case "application.approved":
      return `Your application for ${petName ?? "this pet"} was approved 🎉`;
    case "application.rejected":
      return `Your application for ${petName ?? "this pet"} was rejected`;
    default:
      return "Notification";
  }
}

function renderSubtitle(type: string) {
  switch (type) {
    case "application.created":
      return "Someone applied for your pet.";
    case "application.approved":
      return "The owner approved your adoption request.";
    case "application.rejected":
      return "The owner rejected your adoption request.";
    default:
      return "";
  }
}

function renderActions(n: any, petId?: string) {
  const base =
    "rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm shadow-sm transition-colors hover:bg-gray-50";
  if (n.type === "application.created") {
    return (
      <Link
        href={petId ? `/pets/${petId}/applications` : "#"}
        className={base + (petId ? "" : " pointer-events-none opacity-50")}
        aria-disabled={!petId}
      >
        Review
      </Link>
    );
  }
  if (n.type === "application.approved") {
    return (
      <Link
        href={petId ? `/pets/${petId}` : "#"}
        className={base + (petId ? "" : " pointer-events-none opacity-50")}
        aria-disabled={!petId}
      >
        View pet
      </Link>
    );
  }
  if (n.type === "application.rejected") {
    return (
      <div className="flex gap-2">
        <Link
          href={petId ? `/pets/${petId}` : "#"}
          className={base + (petId ? "" : " pointer-events-none opacity-50")}
          aria-disabled={!petId}
        >
          View pet
        </Link>
        <Link href="/adopt" className={base}>
          Browse other pets
        </Link>
      </div>
    );
  }
  return null;
}

function Empty() {
  return (
    <div className="rounded-2xl border border-dashed p-12 text-center">
      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-indigo-50 text-indigo-600">
        <UserPlus2 className="h-5 w-5" />
      </div>
      <h3 className="text-lg font-medium">Nothing here yet</h3>
      <p className="mt-1 text-sm text-gray-600">
        You’ll see messages here when there’s activity.
      </p>
      <div className="mt-4">
        <Link
          href="/adopt"
          className="inline-flex items-center rounded-full bg-indigo-600 px-4 py-2 text-white shadow-sm transition-colors hover:bg-indigo-700"
        >
          Explore pets
        </Link>
      </div>
    </div>
  );
}

/* ───────────────── helpers ───────────────── */

type Accent = { bg: string; fg: string };

function iconForType(type: string): { Icon: LucideIcon; accent: Accent } {
  switch (type) {
    case "application.created":
      return {
        Icon: UserPlus2,
        accent: { bg: "bg-indigo-50", fg: "text-indigo-700" },
      };
    case "application.approved":
      return {
        Icon: CheckCircle2,
        accent: { bg: "bg-emerald-50", fg: "text-emerald-700" },
      };
    case "application.rejected":
      return {
        Icon: XCircle,
        accent: { bg: "bg-rose-50", fg: "text-rose-700" },
      };
    default:
      return {
        Icon: PawPrint,
        accent: { bg: "bg-gray-50", fg: "text-gray-700" },
      };
  }
}

function groupByDay(items: any[]): { label: string; items: any[] }[] {
  const buckets: Record<string, any[]> = {};
  for (const it of items) {
    const d = it.created_at ? new Date(it.created_at) : new Date();
    const key = d.toDateString();
    (buckets[key] ||= []).push(it);
  }
  // label: Today, Yesterday, or formatted date
  const today = new Date().toDateString();
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yesterday = y.toDateString();

  return Object.entries(buckets)
    .sort(([a], [b]) => Number(new Date(b)) - Number(new Date(a)))
    .map(([key, arr]) => ({
      label:
        key === today
          ? "Today"
          : key === yesterday
          ? "Yesterday"
          : new Date(key).toLocaleDateString(undefined, {
              month: "long",
              day: "numeric",
              year: "numeric",
            }),
      items: arr,
    }));
}

/** Friendly “when” formatter that includes the date (no seconds). */
function formatWhen(d: Date): string {
  const now = new Date();

  const sameDay = d.toDateString() === now.toDateString();
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === y.toDateString();

  const date = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);

  const time = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(d);

  if (sameDay) return `Today, ${date}, ${time}`;
  if (isYesterday) return `Yesterday, ${date}, ${time}`;
  return `${date}, ${time}`;
}
