// app/users/[id]/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { Flag, Link2, Check, Copy } from "lucide-react";

type ProfileRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at?: string | null;
  links?: { label?: string; url: string }[] | null;
  is_verified?: boolean | number | string | null;
};

export const dynamic = "force-dynamic";

// robust truthy check (covers true/"true"/1/"1")
function isTruthy(v: unknown) {
  return v === true || v === 1 || v === "1" || (typeof v === "string" && v.toLowerCase() === "true");
}

// pull "Address: ..." line out of bio (same convention used in profile editor)
function getAddressFromBio(bio: string | null): string | null {
  if (!bio) return null;
  // find the first line that starts with "Address:" (case-insensitive)
  const m = bio.match(/^\s*Address:\s*(.+)\s*$/im);
  return m ? m[1].trim() : null;
}

export default async function UserPublicProfilePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const supabase = getSupabaseServerClient();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone, bio, avatar_url, created_at, links, is_verified")
    .eq("id", params.id)
    .single<ProfileRow>();

  const showReport = (searchParams?.report as string) === "1";

  async function submitUserReport(formData: FormData) {
    "use server";
    const supabase = getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      redirect(`/sign-in?next=${encodeURIComponent(`/users/${params.id}?report=1`)}`);
    }
    const reason = String(formData.get("reason") || "");
    const notes = String(formData.get("notes") || "");
    const reportedUserId = String(formData.get("reported_user_id") || "");
    if (!reportedUserId) redirect(`/users/${params.id}`);
    await supabase.from("user_reports").insert({
      reported_user_id: reportedUserId,
      reporter_user_id: user.id,
      reason,
      notes: notes || null,
    });
    redirect(`/users/${params.id}`);
  }

  function formatLinkLabel(l: { label?: string; url: string }) {
    try {
      const u = new URL(l.url.startsWith("http") ? l.url : `https://${l.url}`);
      return l.label ? `${l.label} · ${u.hostname}${u.pathname}` : `${u.hostname}${u.pathname}`;
    } catch {
      return l.label ? `${l.label} · ${l.url}` : l.url;
    }
  }

  if (error || !profile) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-2xl font-semibold">User profile</h1>
        <p className="mt-4 rounded border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
          Profile not found.
        </p>
      </main>
    );
  }

  const memberSince = profile.created_at ? new Date(profile.created_at).toLocaleDateString() : "—";
  const showVerified = isTruthy(profile.is_verified);
  const fullAddress = getAddressFromBio(profile.bio);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">User profile</h1>
          <p className="text-gray-600">Basic info for this adopter.</p>
        </div>
        <Link href="/dashboard" className="rounded-lg border px-4 py-2 hover:bg-gray-50">
          Back
        </Link>
      </div>

      {/* Card */}
      <div className="mt-4 overflow-hidden rounded-3xl border border-black/5 bg-white/95 shadow-sm">
        {/* Banner */}
        <div className="relative h-36 sm:h-40 w-full rounded-t-3xl bg-gradient-to-r from-[#9e63ff] via-[#c45bff] to-[#ff73c6] overflow-visible">
          <div className="absolute inset-0">
            <div className="absolute left-8 top-4 select-none text-[3.5rem] text-white/25">🐾</div>
            <div className="absolute right-10 top-6 select-none text-[4rem] text-white/25">🐾</div>
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 select-none text-[5rem] text-white/20">🐾</div>
          </div>

          <Link
            href={`/users/${profile.id}?report=1`}
            className="absolute right-4 top-3 inline-flex items-center gap-2 rounded-lg bg-white/90 px-3 py-1.5 text-sm font-medium text-gray-700 shadow hover:bg-white"
            title="Report user"
          >
            <Flag className="h-4 w-4" />
            Report user
          </Link>

          {/* Avatar */}
          <div className="absolute -bottom-10 left-5">
            <div className="h-20 w-20 overflow-hidden rounded-full ring-3 ring-white shadow-md">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <span className="grid h-full w-full place-items-center bg-white text-2xl">🙂</span>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="relative p-3 sm:p-4">
          <div className="pl-28 sm:pl-32">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1 text-lg font-semibold sm:text-xl">
                {profile.full_name || "Unnamed user"}
                {showVerified && (
                  <span
                    title="Verified user"
                    className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-white"
                  >
                    <Check className="h-3 w-3" />
                  </span>
                )}
              </div>

              {/* Copy with visible feedback (inline, no extra file) */}
              <button
                id="copy-user-id-btn"
                data-uid={profile.id}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                title="Copy User ID"
              >
                <Copy className="h-4 w-4" />
                <span id="copy-user-id-label">Copy User ID</span>
              </button>

              <span className="select-all text-xs text-gray-500">{profile.id}</span>
            </div>

            <div className="mt-0.5 text-sm text-gray-500">
              Member since <span className="font-medium">{memberSince}</span>
            </div>
          </div>

          {/* Details */}
          <div className="mt-2">
            <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-white to-violet-50/40 p-3 sm:p-4">
              <dl className="grid grid-cols-1 gap-3">
                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Phone</dt>
                  <dd className="mt-1 text-gray-800">
                    {profile.phone || <span className="text-gray-400">Not set</span>}
                  </dd>
                </div>

                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Full address</dt>
                  <dd className="mt-1 text-gray-800">
                    {fullAddress ? fullAddress : <span className="text-gray-400">Not set</span>}
                  </dd>
                </div>

                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Bio</dt>
                  <dd className="mt-1 whitespace-pre-wrap text-gray-800">
                    {profile.bio || <span className="text-gray-400">No bio yet.</span>}
                  </dd>
                </div>

                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Links</dt>
                  <dd className="mt-1.5 flex flex-wrap items-center gap-2">
                    {Array.isArray(profile.links) && profile.links.length > 0 ? (
                      profile.links.map((l, idx) => {
                        const labelText = formatLinkLabel(l);
                        const href = l.url.startsWith("http") ? l.url : `https://${l.url}`;
                        return (
                          <a
                            key={idx}
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm hover:bg-gray-50"
                          >
                            <Link2 className="h-4 w-4" />
                            <span className="font-medium">{l.label || "Link"}</span>
                            <span className="max-w-[200px] truncate text-gray-500">{labelText}</span>
                          </a>
                        );
                      })
                    ) : (
                      <span className="text-gray-400">No links added.</span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Report Dialog */}
      {showReport && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="bg-gradient-to-r from-[#9e63ff] via-[#c45bff] to-[#ff73c6] px-5 py-3 text-white">
              <div className="font-semibold">Report this user</div>
            </div>

            <form action={submitUserReport} className="space-y-4 p-5">
              <input type="hidden" name="reported_user_id" value={profile.id} />
              <div>
                <label className="text-sm text-gray-600">Reason</label>
                <select
                  name="reason"
                  defaultValue="Spam or misleading"
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 outline-none ring-indigo-500 focus:ring-2"
                >
                  <option>Spam or misleading</option>
                  <option>Harassment or hate</option>
                  <option>Fraud or scam</option>
                  <option>Posting inappropriate content</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600">Notes (optional)</label>
                <textarea
                  name="notes"
                  rows={4}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 outline-none ring-indigo-500 focus:ring-2"
                  placeholder="Add more details to help us understand the issue…"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Link href={`/users/${profile.id}`} className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50">
                  Cancel
                </Link>
                <button
                  type="submit"
                  className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-500"
                >
                  Submit report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inline script for copy feedback */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function(){
              var btn = document.getElementById('copy-user-id-btn');
              if(!btn) return;
              var label = document.getElementById('copy-user-id-label');
              var uid = btn.getAttribute('data-uid') || '';
              var base = 'inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm';
              var normal = ' border-gray-200 bg-white text-gray-700 hover:bg-gray-50';
              var success = ' border-emerald-300 bg-emerald-50 text-emerald-700';
              btn.addEventListener('click', async function(e){
                e.preventDefault();
                try {
                  await navigator.clipboard.writeText(uid);
                  if(label) label.textContent = 'Copied!';
                  btn.className = base + success;
                  setTimeout(function(){
                    if(label) label.textContent = 'Copy User ID';
                    btn.className = base + normal;
                  }, 1400);
                } catch (err) {}
              }, { passive: false });
            })();
          `,
        }}
      />
    </main>
  );
}
