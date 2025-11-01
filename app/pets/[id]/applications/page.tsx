// app/pets/[id]/applications/page.tsx
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import ManageApplicationButtons from "@/components/ManageApplicationButtons";

export const dynamic = "force-dynamic";

/* ───────────── Server action: approve / reject / pending ───────────── */
export async function updateApplicationStatus(formData: FormData) {
  "use server";

  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const applicationId = String(formData.get("application_id") || "");
  const nextStatus = String(formData.get("next_status") || ""); // approved | rejected | pending
  const back = String(formData.get("returnTo") || "/adopt");
  const confirmed = String(formData.get("confirmed") || "") === "1";

  const allowed = new Set(["approved", "rejected", "pending"]);
  if (!user || !applicationId || !allowed.has(nextStatus)) {
    redirect(back);
  }

  // Load application → pet_id
  const { data: app } = await supabase
    .from("applications")
    .select("id, pet_id")
    .eq("id", applicationId)
    .single();
  if (!app) redirect(back);

  // Verify owner
  const { data: pet } = await supabase
    .from("pets")
    .select("id, owner_id")
    .eq("id", app.pet_id)
    .single();
  if (!pet || pet.owner_id !== user.id) redirect("/adopt");

  // ✅ If trying to approve and not yet confirmed, show modal first
  if (nextStatus === "approved" && !confirmed) {
    const sep = back.includes("?") ? "&" : "?";
    redirect(
      `${back}${sep}confirmApproveApp=${encodeURIComponent(applicationId)}`
    );
  }

  // Stamp/clear rejected_at depending on status
  const patch =
    nextStatus === "rejected"
      ? { status: "rejected", rejected_at: new Date().toISOString() }
      : { status: nextStatus, rejected_at: null };

  await supabase.from("applications").update(patch).eq("id", applicationId);

  revalidatePath(`/pets/${app.pet_id}/applications`);
  revalidatePath("/adopt");
  redirect(back);
}

/* ───────────────────────────── Page ───────────────────────────── */
export default async function ManagePetApplicationsPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const supabase = getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(
      `/sign-in?next=${encodeURIComponent(
        `/pets/${params.id}/applications`
      )}`
    );
  }

  const { data: pet } = await supabase
    .from("pets")
    .select("id, name, owner_id")
    .eq("id", params.id)
    .single();

  if (!pet || pet.owner_id !== user.id) redirect("/adopt");

  const status = qp(searchParams, "status") || "all";
  const confirmApproveApp = qp(searchParams, "confirmApproveApp");
  const viewIdsAppId = qp(searchParams, "viewIds");

  let appsQuery = supabase
    .from("applications")
    .select("*")
    .eq("pet_id", pet.id)
    .order("created_at", { ascending: false });

  if (status !== "all") appsQuery = appsQuery.eq("status", status);

  const { data: applications, error } = await appsQuery;

  const returnParams = new URLSearchParams();
  if (status && status !== "all") returnParams.set("status", status);
  const returnTo = `/pets/${pet.id}/applications?${returnParams.toString()}`;

  const applicationForIds =
    viewIdsAppId && applications
      ? applications.find((a: any) => String(a.id) === String(viewIdsAppId))
      : null;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            Applications for {pet.name}
          </h1>
          <p className="text-gray-600">Approve, reject, or cancel an approval.</p>
        </div>

        <Link
          href="/dashboard#your-pets"
          className="rounded-lg border px-4 py-2 hover:bg-gray-50"
        >
          Back to pet
        </Link>
      </div>

      {confirmApproveApp && (
        <ApproveSafetyModal
          applicationId={confirmApproveApp}
          returnTo={returnTo}
        />
      )}

      {applicationForIds && (
        <SeeIdsModal app={applicationForIds} closeHref={returnTo} />
      )}

      <StatusFilter current={status} petId={pet.id} />

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
          Error loading applications: {error.message}
        </div>
      )}

      <div className="space-y-3">
        {!applications || applications.length === 0 ? (
          <EmptyApps />
        ) : (
          applications.map((a: any) => {
            const createdAt = a.created_at || a.inserted_at || a.createdAt;
            const curStatus: "pending" | "approved" | "rejected" = (a.status ||
              "pending") as any;

            const fullName =
              a.full_name ??
              a.fullName ??
              a.applicant_name ??
              a.name ??
              undefined;

            const phone =
              a.contact_number ??
              a.phone_number ??
              a.contact ??
              a.phone ??
              a.contactNumber ??
              a.phoneNumber ??
              undefined;

            const address =
              a.address ?? a.city ?? a.location ?? undefined;

            const email =
              a.email ?? a.applicant_email ?? a.contact_email ?? undefined;

            const rawNotes =
              a.message ?? a.reason ?? a.notes ?? a.note ?? "";
            const notes = stripAttachmentLines(rawNotes);

            const applicantId = getApplicantId(a);
            const applicantDisplay =
              fullName ?? applicantId ?? "unknown";

            const rejectedAtIso: string | undefined =
              a.rejected_at || a.rejectedAt;
            const autoDeleteHint =
              curStatus === "rejected"
                ? timeLeftText(rejectedAtIso)
                : null;

            const seeIdsParams = new URLSearchParams();
            if (status && status !== "all")
              seeIdsParams.set("status", status);
            seeIdsParams.set("viewIds", a.id);
            const seeIdsHref = `/pets/${pet.id}/applications?${seeIdsParams.toString()}`;

            return (
              <div
                key={a.id}
                className="flex items-start justify-between gap-4 rounded-xl border bg-white p-4"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">Applicant:</span>
                    <span className="rounded bg-indigo-50 px-2 py-0.5 text-sm text-indigo-700">
                      {applicantDisplay}
                    </span>
                    <StatusPill status={curStatus} />
                    {autoDeleteHint && (
                      <span className="text-xs text-gray-500">
                        ({autoDeleteHint})
                      </span>
                    )}
                  </div>

                  {createdAt ? (
                    <div className="mt-1 text-sm text-gray-600">
                      Submitted: {new Date(createdAt).toLocaleString()}
                    </div>
                  ) : null}

                  {email ? (
                    <div className="mt-1 text-sm">
                      <span className="text-gray-600">Email: </span>
                      {email}
                    </div>
                  ) : null}
                  {phone ? (
                    <div className="text-sm">
                      <span className="text-gray-600">Contact number: </span>
                      {phone}
                    </div>
                  ) : null}
                  {address ? (
                    <div className="text-sm">
                      <span className="text-gray-600">Address: </span>
                      {address}
                    </div>
                  ) : null}

                  {notes ? (
                    <p className="mt-2 whitespace-pre-line text-sm text-gray-800">
                      <span className="font-medium">Message:</span> {notes}
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {applicantId && (
                    <Link
                      href={`/users/${applicantId}`}
                      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-500"
                    >
                      See profile
                    </Link>
                  )}

                  <Link
                    href={seeIdsHref}
                    className="rounded-lg bg-purple-500 px-3 py-1.5 text-sm text-white hover:bg-purple-400"
                  >
                    See IDs
                  </Link>

                  <ManageApplicationButtons
                    action={updateApplicationStatus}
                    applicationId={a.id}
                    returnTo={returnTo}
                    currentStatus={curStatus}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}

/* ───────── helpers / ui ───────── */

function qp(
  sp: Record<string, string | string[] | undefined> | undefined,
  key: string
): string | undefined {
  const v = sp?.[key];
  return Array.isArray(v) ? v[0] : v;
}

function getApplicantId(a: any): string | undefined {
  return (
    a.applicant_id ??
    a.adopter_id ??
    a.user_id ??
    a.userId ??
    a.applicantId
  );
}

function StatusPill({
  status,
}: {
  status: "pending" | "approved" | "rejected";
}) {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1";
  switch (status) {
    case "approved":
      return (
        <span
          className={`${base} bg-emerald-50 text-emerald-700 ring-emerald-100`}
        >
          Approved
        </span>
      );
    case "rejected":
      return (
        <span
          className={`${base} bg-rose-50 text-rose-700 ring-rose-100`}
        >
          Rejected
        </span>
      );
    default:
      return (
        <span
          className={`${base} bg-amber-50 text-amber-700 ring-amber-100`}
        >
          Pending
        </span>
      );
  }
}

function EmptyApps() {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
      <h3 className="text-lg font-medium">No applications yet</h3>
      <p className="mt-1 text-gray-600">
        You’ll see requests here when adopters apply.
      </p>
    </div>
  );
}

function StatusFilter({ current, petId }: { current: string; petId: string }) {
  const mk = (s: string) => {
    const params = new URLSearchParams();
    if (s !== "all") params.set("status", s);
    return `/pets/${petId}/applications?${params.toString()}`;
  };
  const btn =
    "rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50 aria-[current=true]:bg-gray-900 aria-[current=true]:text-white";
  return (
    <div className="flex items-center gap-2">
      <Link href={mk("all")} aria-current={current === "all"} className={btn}>
        All
      </Link>
      <Link
        href={mk("pending")}
        aria-current={current === "pending"}
        className={btn}
      >
        Pending
      </Link>
      <Link
        href={mk("approved")}
        aria-current={current === "approved"}
        className={btn}
      >
        Approved
      </Link>
      <Link
        href={mk("rejected")}
        aria-current={current === "rejected"}
        className={btn}
      >
        Rejected
      </Link>
    </div>
  );
}

function timeLeftText(rejectedAtIso?: string): string | null {
  if (!rejectedAtIso) return null;
  const rejectedAt = new Date(rejectedAtIso);
  if (isNaN(rejectedAt.getTime())) return null;

  const deadline = new Date(rejectedAt.getTime() + 24 * 60 * 60 * 1000);
  const diff = deadline.getTime() - Date.now();
  if (diff <= 0) return "scheduled for removal";

  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  return `auto-removes in ${hours}h ${minutes}m`;
}

/* ───────── Modal: confirm approve with safety warning ───────── */
function ApproveSafetyModal({
  applicationId,
  returnTo,
}: {
  applicationId: string;
  returnTo: string;
}) {
  const cleanReturn = (() => {
    try {
      const u = new URL(returnTo, "http://x");
      u.searchParams.delete("confirmApproveApp");
      const q = u.searchParams.toString();
      return `${u.pathname}${q ? `?${q}` : ""}`;
    } catch {
      return returnTo.split("?")[0] || returnTo;
    }
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-6 shadow-2xl">
        <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
          <p className="text-sm">
            <strong>Safety reminder:</strong> Meet in a public place and bring a
            companion. Never send deposits or share sensitive information.
            Verify adopter identity, vaccination/medical records, and keep your
            communication on PawPortal.
          </p>
        </div>
        <h2 className="text-lg font-semibold">Approve this application?</h2>
        <p className="mt-2 text-sm text-gray-600">
          Approving will notify the applicant and mark this pet as adopted if
          you finalize the handover. You can still chat and coordinate next
          steps.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <a
            href={cleanReturn}
            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            Cancel
          </a>
          <form action={updateApplicationStatus} method="post">
            <input type="hidden" name="application_id" value={applicationId} />
            <input type="hidden" name="next_status" value="approved" />
            <input type="hidden" name="confirmed" value="1" />
            <input type="hidden" name="returnTo" value={cleanReturn} />
            <button
              type="submit"
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white shadow-sm hover:bg-emerald-700"
            >
              Confirm approve
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ───────── Modal: See IDs (with real zoom) ───────── */
function SeeIdsModal({
  app,
  closeHref,
}: {
  app: any;
  closeHref: string;
}) {
  const parsed = extractIdLinks(app.message ?? app.notes ?? "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-5xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">ID attachments</h2>
            <p className="text-sm text-gray-500">
              From: {app.full_name ?? app.applicant_id ?? "Unknown applicant"}
            </p>
          </div>
          <a
            href={closeHref}
            className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm hover:bg-gray-200"
          >
            Close
          </a>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <IdCard label="Barangay clearance" url={parsed.barangay} idx={1} />
          <IdCard label="Police clearance / NBI" url={parsed.police} idx={2} />
          <IdCard label="Primary ID" url={parsed.primary} idx={3} />
        </div>

        {parsed.others.length > 0 && (
          <div className="mt-5">
            <p className="text-xs text-gray-500 mb-2">
              Other links found in message:
            </p>
            <ul className="space-y-1 text-xs text-blue-600 break-all">
              {parsed.others.map((o, i) => (
                <li key={i}>{o}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────── Click-to-zoom card (fixed close working) ───────── */
function IdCard({
  label,
  url,
  idx,
}: {
  label: string;
  url: string | null;
  idx: number;
}) {
  const zoomId = `idzoom-${idx}`;
  return (
    <div className="rounded-xl border bg-gray-50/60 p-3">
      <p className="text-xs font-medium text-gray-700 mb-2">{label}</p>
      {url ? (
        <div className="relative">
          {/* toggle */}
          <input id={zoomId} type="checkbox" className="peer sr-only" />

          {/* thumbnail */}
          <label
            htmlFor={zoomId}
            className="block cursor-zoom-in overflow-hidden rounded-lg border bg-white"
          >
            <img
              src={url}
              alt={label}
              className="h-48 w-full object-contain transition duration-150 hover:scale-105"
            />
          </label>
          <p className="mt-1 text-[10px] text-gray-400">Click to view larger</p>

          {/* overlay zoom */}
          <div
            className="pointer-events-none fixed inset-0 z-[9999] hidden items-center justify-center bg-black/60 p-4
                       peer-checked:flex peer-checked:pointer-events-auto"
          >
            {/* backdrop – click anywhere to close */}
            <label htmlFor={zoomId} className="absolute inset-0 cursor-pointer" />

            <div className="relative z-10 max-h-[90vh] w-full max-w-4xl rounded-xl bg-white/5 p-2 shadow-2xl">
              <img
                src={url}
                alt={label}
                className="max-h-[82vh] w-full object-contain rounded-md bg-white"
              />
              <label
                htmlFor={zoomId}
                className="mt-3 inline-flex cursor-pointer items-center gap-1 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-white"
              >
                Close
              </label>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-[11px] text-gray-400">Not provided.</p>
      )}
    </div>
  );
}

/* ───────── parse URLs from message text ───────── */
function extractIdLinks(message: string) {
  const result: {
    barangay: string | null;
    police: string | null;
    primary: string | null;
    others: string[];
  } = {
    barangay: null,
    police: null,
    primary: null,
    others: [],
  };

  if (!message) return result;

  const lines = message.split("\n").map((l) => l.trim());
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.startsWith("barangay clearance:")) {
      const url = line.split(":").slice(1).join(":").trim();
      if (url) result.barangay = url;
      continue;
    }
    if (
      lower.startsWith("police/nbi:") ||
      lower.startsWith("police clearance:") ||
      lower.startsWith("police clearance / nbi:")
    ) {
      const url = line.split(":").slice(1).join(":").trim();
      if (url) result.police = url;
      continue;
    }
    if (lower.startsWith("primary id:")) {
      const url = line.split(":").slice(1).join(":").trim();
      if (url) result.primary = url;
      continue;
    }

    if (line.startsWith("http://") || line.startsWith("https://")) {
      result.others.push(line);
    }
  }

  return result;
}

/* ───────── remove attachment lines from message shown in list ───────── */
function stripAttachmentLines(raw: string): string {
  if (!raw) return "";
  const lines = raw.split("\n");
  const kept: string[] = [];
  for (const line of lines) {
    const l = line.trim();
    if (!l) continue;
    const lower = l.toLowerCase();

    if (lower === "attached ids:") continue;
    if (lower.startsWith("barangay clearance:")) continue;
    if (lower.startsWith("police/nbi:")) continue;
    if (lower.startsWith("police clearance")) continue;
    if (lower.startsWith("primary id:")) continue;
    if (l.includes("/storage/v1/object/public/id-uploads/")) continue;

    kept.push(l);
  }
  return kept.join("\n");
}
