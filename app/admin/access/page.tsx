// app/admin/access/page.tsx
import Image from "next/image";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import ReportStatusPicker from "@/components/ReportStatusPicker";
import ConfirmDeleteButton from "@/components/ConfirmDeleteButton";

// ✅ Use a service-role client for admin deletes (bypasses RLS)
import { createClient } from "@supabase/supabase-js";
const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export const dynamic = "force-dynamic";

/* ───────── Types ───────── */
type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

type ReportRecord = {
  id: string;
  created_at: string;
  status: "open" | "closed" | "dismissed" | string | null;
  reason: string | null;
  notes: string | null;
  reporter_user_id: string;
  reported_user_id: string;
};

type ReportRow = ReportRecord & {
  reporter?: Profile | null;
  reported?: Profile | null;
};

/* ───────── Server action: update report status ───────── */
/*  NOTE: hindi na exported!  */
async function updateReportStatus(formData: FormData) {
  "use server";
  const id = String(formData.get("report_id") || "");
  const status = (String(formData.get("status") || "open") as
    | "open"
    | "closed"
    | "dismissed");

  if (!id) return;

  const supabase = getSupabaseServerClient();
  await supabase.from("user_reports").update({ status }).eq("id", id);

  revalidatePath("/admin/access");
}

/* ───────── Server action: delete a report (service role) ───────── */
/*  NOTE: hindi na exported!  */
async function deleteReport(formData: FormData) {
  "use server";
  const id = String(formData.get("report_id") || "");
  if (!id) return;

  const { error } = await service.from("user_reports").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/access");
}

/* ───────── Page (scrollable list, no pagination) ───────── */
export default async function AdminReportsPage() {
  const supabase = getSupabaseServerClient();

  // Fetch ALL reports (ordered newest first)
  const { data: reportsRaw, error } = await supabase
    .from("user_reports")
    .select(
      "id, created_at, status, reason, notes, reporter_user_id, reported_user_id",
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  const reports: ReportRow[] = (reportsRaw as any) ?? [];
  const total = reports?.length ?? 0;

  // Load all involved profiles once, then stitch
  let profilesById: Record<string, Profile> = {};
  if (!error && total > 0) {
    const ids = Array.from(
      new Set(
        reports
          .flatMap((r) => [r.reporter_user_id, r.reported_user_id])
          .filter(Boolean)
      )
    );

    if (ids.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", ids);

      if (profs?.length) {
        profilesById = Object.fromEntries(
          (profs as any[]).map((p) => [p.id as string, p as Profile])
        );
      }

      for (const r of reports) {
        r.reporter = profilesById[r.reporter_user_id] ?? null;
        r.reported = profilesById[r.reported_user_id] ?? null;
      }
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold tracking-tight">User reports</h2>
        <p className="mt-1 text-sm text-gray-600">
          Review and manage profile reports submitted by users.
        </p>
      </div>

      {/* Fixed-height card: only the list scrolls */}
      <div className="rounded-3xl border border-black/5 bg-white/85 shadow-sm backdrop-blur h-[75vh] flex flex-col">
        {/* Header / summary row (not scrollable) */}
        <div className="p-3 border-b border-gray-100">
          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              Failed to load reports: {error.message}
            </div>
          ) : total === 0 ? (
            <div className="grid place-items-center rounded-2xl border border-gray-100 bg-gradient-to-br from-white to-violet-50/40 px-6 py-8 text-center">
              <div className="mb-3 grid h-10 w-10 place-items-center rounded-full bg-rose-100">
                <span className="text-rose-500">🏳️</span>
              </div>
              <div className="text-gray-800 font-medium">No reports to review</div>
              <div className="mt-1 text-sm text-gray-600">
                When users submit profile reports, they’ll appear here.
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-600">
              Showing <span className="font-medium text-gray-800">{total}</span>{" "}
              report{total === 1 ? "" : "s"}
            </div>
          )}
        </div>

        {/* Scrollable list area */}
        {total > 0 && (
          <div className="flex-1 overflow-y-auto px-3 py-3">
            <ul className="space-y-3">
              {reports.map((r) => (
                <li
                  key={r.id}
                  className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:shadow"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    {/* Left: reporter -> reported (clickable) */}
                    <div className="flex items-center gap-3">
                      <ClickableUser
                        profile={r.reporter}
                        fallbackLabel="Unknown"
                        title="View reporter"
                      />
                      <div className="text-sm text-gray-700">
                        <span className="mx-1 text-gray-400">reported</span>
                      </div>
                      <ClickableUser
                        profile={r.reported}
                        fallbackLabel="Unknown"
                        title="View reported user"
                      />
                      <div className="ml-2 text-xs text-gray-500">
                        Filed: {new Date(r.created_at).toLocaleString()}
                      </div>
                    </div>

                    {/* Right: status dropdown + X delete */}
                    <div className="flex items-center gap-2">
                      <ReportStatusPicker
                        reportId={r.id}
                        initialStatus={(r.status as "open" | "closed") ?? "open"}
                        updateStatus={updateReportStatus}
                      />
                      <ConfirmDeleteButton reportId={r.id} action={deleteReport} />
                    </div>
                  </div>

                  {/* Body: reason + notes */}
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                        Reason
                      </div>
                      <div className="mt-1 text-gray-800">{r.reason ?? "—"}</div>
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                        Notes
                      </div>
                      <div className="mt-1 whitespace-pre-wrap text-gray-800">
                        {r.notes || (
                          <span className="text-gray-400">No notes added.</span>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}

/* ───────── helpers ───────── */

function Avatar({
  src,
  alt,
  size = 24,
}: {
  src: string | null | undefined;
  alt: string | null | undefined;
  size?: number;
}) {
  return (
    <div
      className="overflow-hidden rounded-full ring-1 ring-gray-200 bg-gray-100"
      style={{ width: size, height: size }}
    >
      {src ? (
        <Image
          src={src}
          alt={alt ?? ""}
          width={size}
          height={size}
          className="h-full w-full object-cover"
          unoptimized
        />
      ) : (
        <div className="grid h-full w-full place-items-center text-gray-400">
          🐾
        </div>
      )}
    </div>
  );
}

function ClickableUser({
  profile,
  fallbackLabel,
  title,
}: {
  profile: Profile | null | undefined;
  fallbackLabel: string;
  title?: string;
}) {
  const label = profile?.full_name ?? fallbackLabel;
  const avatar = <Avatar src={profile?.avatar_url} alt={label} size={24} />;

  if (profile?.id) {
    return (
      <Link
        href={`/users/${profile.id}`}
        className="inline-flex items-center gap-2 text-sm text-indigo-700 hover:underline"
        title={title}
      >
        {avatar}
        <span className="font-medium">{label}</span>
      </Link>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 text-sm text-gray-700">
      {avatar}
      <span className="font-medium">{label}</span>
    </span>
  );
}
