import Link from "next/link";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import ActionsBar from "./ActionsBar";
import FilterBar from "./FilterBar"; // client filter bar

type PetRow = {
  id: string;
  name?: string | null;
  breed?: string | null;

  // possible type fields
  type?: string | null;
  pet_type?: string | null;
  species?: string | null;
  category?: string | null;

  // possible age fields
  age_months?: number | null;   // months
  ageMonths?: number | null;    // months
  age_in_months?: number | null;// months
  age?: number | null;          // assume YEARS when present

  // possible dob fields
  dob?: string | null;
  birthdate?: string | null;
  date_of_birth?: string | null;

  // pet status (may be null or different vocabulary)
  status?: string | null;

  owner_id?: string | null;
  created_at?: string | null;
};

function fmt(v: unknown, fallback = "—") {
  if (v === null || v === undefined || v === "") return fallback;
  return String(v);
}
function formatAddedDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(+d)
    ? "—"
    : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
function pickString(...candidates: Array<string | null | undefined>) {
  for (const c of candidates) {
    if (c !== undefined && c !== null && String(c).trim() !== "") return String(c);
  }
  return undefined;
}
function monthsBetween(a: Date, b: Date) {
  const years = b.getUTCFullYear() - a.getUTCFullYear();
  const months = years * 12 + (b.getUTCMonth() - a.getUTCMonth());
  const dayAdjust = b.getUTCDate() >= a.getUTCDate() ? 0 : -1;
  return Math.max(0, months + dayAdjust);
}
function resolveType(p: PetRow): string | null {
  const v = pickString(p.type, p.pet_type, p.species, p.category);
  return v ? String(v) : null;
}

/* ---------------- Status normalization ---------------- */
const ADOPTED = ["adopted", "completed"];
const APPROVED = ["approved", "accepted"];
const PENDING  = ["pending", "in_review", "open", "listed", "active"];
const REJECTED = ["rejected", "declined", "denied", "cancelled", "canceled", "withdrawn", "failed", "closed", "archived", "unavailable"];

type CanonicalStatus = "Adopted" | "Approved" | "Pending" | "Rejected";

function normalizeStatus(s?: string | null): CanonicalStatus | null {
  if (!s) return null;
  const v = s.toLowerCase().trim();
  if (ADOPTED.includes(v)) return "Adopted";
  if (APPROVED.includes(v)) return "Approved";
  if (PENDING.includes(v))  return "Pending";
  if (REJECTED.includes(v)) return "Rejected";
  return null;
}

// winner by precedence: Adopted > Approved > Pending > Rejected
const statusRank: Record<CanonicalStatus, number> = {
  Adopted: 4,
  Approved: 3,
  Pending: 2,
  Rejected: 1,
};
function pickBestStatus(a?: CanonicalStatus | null, b?: CanonicalStatus | null): CanonicalStatus | null {
  if (!a && !b) return null;
  if (!a) return b!;
  if (!b) return a!;
  return statusRank[a] >= statusRank[b] ? a : b;
}

/* ---------------- Age resolution ---------------- */
// Return a human string + remember whether the source looked like months or years.
function resolveAgeDisplay(p: PetRow): string {
  // Explicit months fields win → show as "X mo"
  const m =
    p.age_months ??
    p.ageMonths ??
    p.age_in_months ??
    null;

  if (m !== null && m !== undefined && !isNaN(Number(m))) {
    const months = Math.max(0, Math.round(Number(m)));
    return `${months} mo`;
  }

  // If `age` exists, treat it as YEARS → show as "X yr"
  if (p.age !== null && p.age !== undefined && !isNaN(Number(p.age))) {
    const years = Math.max(0, Number(p.age));
    return `${years} yr`;
  }

  // Fallback: derive from DOB; use mo if < 24, else years
  const dob = pickString(p.dob, p.birthdate, p.date_of_birth);
  if (dob) {
    const d = new Date(dob);
    if (!isNaN(+d)) {
      const months = monthsBetween(d, new Date());
      if (months < 24) return `${months} mo`;
      const years = Math.floor(months / 12);
      return `${years} yr`;
    }
  }
  return "—";
}

/* ---------------- UI helpers ---------------- */
function pTypeToLabel(t: string | null) {
  if (!t) return null;
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: {
    page?: string; // 1-based page index
    per?: string;  // items per page
    q?: string;    // text search
    ptype?: string; // all | dog | cat | other
  };
};

export default async function AdminPetsPage({ searchParams }: PageProps) {
  const supabase = getSupabaseServerClient();

  // ---- Filters from URL ----
  const q = (searchParams?.q ?? "").toString().trim();
  const ptype = (searchParams?.ptype ?? "all").toString().toLowerCase();

  // ---- Pagination params (1-based) ----
  const page = Math.max(1, Number(searchParams?.page ?? 1));
  const perPage = Math.min(100, Math.max(5, Number(searchParams?.per ?? 10)));
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  // 1) Build query with filters (server-side)
  let query = supabase.from("pets").select("*", { count: "exact" });

  // Text search on name/breed
  if (q) {
    const like = `%${q.replace(/%/g, "\\%")}%`;
    query = query.or(`name.ilike.${like},breed.ilike.${like}`);
  }

  // Case-insensitive Type filter across possible columns (use %wildcards%)
  if (ptype && ptype !== "all") {
    const patt = `%${ptype}%`;
    query = query.or(
      `type.ilike.${patt},pet_type.ilike.${patt},species.ilike.${patt},category.ilike.${patt}`
    );
  }

  // Sorting + paging
  query = query.order("created_at", { ascending: false }).range(from, to);

  let { data, error, count } = await query;
  if (error) console.error("admin/pets fetch error:", error.message);

  let pets: PetRow[] = Array.isArray(data) ? (data as PetRow[]) : [];
  let total = typeof count === "number" ? count : pets.length;

  // --- Fallback if DB filter yields none but we likely have data ---
  if (ptype !== "all" && pets.length === 0) {
    const { data: allTry } = await supabase
      .from("pets")
      .select("*")
      .order("created_at", { ascending: false })
      .range(0, 499);

    const all = Array.isArray(allTry) ? (allTry as PetRow[]) : [];
    const filtered = all.filter((p) => (resolveType(p)?.toLowerCase() || "").includes(ptype));

    total = filtered.length;
    const start = (page - 1) * perPage;
    const end = start + perPage;
    pets = filtered.slice(start, end);
  }

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  // 2) Resolve owner names (for current page only)
  const ownerIds = Array.from(new Set(pets.map((p) => p.owner_id).filter(Boolean) as string[]));

  const OWNER_TABLE_CANDIDATES = ["profiles", "users"];
  let ownerRows: Array<any> = [];
  for (const table of OWNER_TABLE_CANDIDATES) {
    if (ownerIds.length === 0) break;
    const { data: owners, error: ownersErr } = await supabase
      .from(table)
      .select("*")
      .in("id", ownerIds);
    if (ownersErr) continue;
    if (owners && owners.length) {
      ownerRows = owners;
      break;
    }
  }

  function pickOwnerName(o: any): string {
    const firstLast = [o.first_name ?? o.firstname, o.last_name ?? o.lastname]
      .filter(Boolean)
      .join(" ")
      .trim();
    return (
      (firstLast || undefined) ??
      o.full_name ?? o.fullName ??
      o.display_name ?? o.displayName ??
      o.name ?? o.username ?? o.handle ?? o.email ?? ""
    );
  }

  const ownerMap = new Map<string, string>(
    ownerRows.map((o) => [o.id, pickOwnerName(o) || o.id])
  );

  const resolveOwner = (id?: string | null) => {
    if (!id) return { label: "—", href: "#" };
    return { label: ownerMap.get(id) ?? id, href: `/users/${id}` };
  };

  // 3) Derive status from applications (current page pets only)
  const petIds = pets.map((p) => p.id);
  const appStatusMap = new Map<string, CanonicalStatus>();

  if (petIds.length) {
    const { data: apps, error: appsErr } = await supabase
      .from("applications")
      .select("pet_id,status")
      .in("pet_id", petIds);

    if (!appsErr && Array.isArray(apps)) {
      for (const a of apps as Array<{ pet_id: string; status: string | null }>) {
        const norm = normalizeStatus(a.status);
        if (!norm) continue;
        const current = appStatusMap.get(a.pet_id);
        appStatusMap.set(a.pet_id, pickBestStatus(current, norm)!);
      }
    }
  }

  // Helper to build page link preserving filters
  const pageHref = (n: number) => {
    const params = new URLSearchParams();
    params.set("page", String(n));
    params.set("per", String(perPage));
    if (q) params.set("q", q);
    if (ptype) params.set("ptype", ptype);
    return `?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-xl font-semibold mb-3">Pet Management</h2>

        {/* Client filter bar (auto-filters on dropdown change) */}
        <FilterBar ptype={ptype} q={q} perPage={perPage} />

        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-white/10">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left bg-gray-50 dark:bg-white/5">
                <th className="px-4 py-3">Select</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Breed</th>
                <th className="px-4 py-3">Age</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Added</th>
              </tr>
            </thead>
            <tbody>
              {pets.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-center text-gray-500 dark:text-white/60" colSpan={8}>
                    No pets found.
                  </td>
                </tr>
              ) : (
                pets.map((p) => {
                  const petType = resolveType(p);
                  const typeLabel = pTypeToLabel(petType);

                  // Compute best status from applications + pet.status
                  const fromApps = appStatusMap.get(p.id) ?? null;
                  const fromPet  = normalizeStatus(p.status);
                  const finalStatus = pickBestStatus(fromApps, fromPet) ?? "Pending";

                  const ageDisplay = resolveAgeDisplay(p);
                  const { label: ownerLabel, href: ownerHref } = resolveOwner(p.owner_id);

                  return (
                    <tr key={p.id} className="border-t border-gray-200 hover:bg-gray-50 dark:border-white/5 dark:hover:bg-white/[0.03]">
                      <td className="px-4 py-3 align-middle">
                        <input type="checkbox" name="selected" value={p.id} className="h-4 w-4 accent-indigo-600 dark:accent-white/70" />
                      </td>
                      <td className="px-4 py-3 align-middle">{fmt(p.name)}</td>
                      <td className="px-4 py-3 align-middle">{fmt(typeLabel ?? petType)}</td>
                      <td className="px-4 py-3 align-middle">{fmt(p.breed)}</td>
                      <td className="px-4 py-3 align-middle">{ageDisplay}</td>
                      <td className="px-4 py-3 align-middle">{finalStatus}</td>
                      <td className="px-4 py-3 align-middle whitespace-nowrap">
                        <Link
                          href={ownerHref}
                          className="text-indigo-600 hover:text-indigo-700 hover:underline dark:text-indigo-400 dark:hover:text-indigo-300"
                          title="Open user profile"
                        >
                          {fmt(ownerLabel)}
                        </Link>
                      </td>
                      <td className="px-4 py-3 align-middle whitespace-nowrap">{formatAddedDate(p.created_at)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Numbered pagination */}
        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="text-xs text-gray-600 dark:text-white/60">
            Showing <span className="font-medium text-gray-900 dark:text-white">{pets.length}</span> of{" "}
            <span className="font-medium text-gray-900 dark:text-white">{total}</span> pets • Page{" "}
            <span className="font-medium text-gray-900 dark:text-white">{page}</span> /{" "}
            <span className="font-medium text-gray-900 dark:text-white">{totalPages}</span>
          </div>

          <nav className="flex items-center gap-1">
            {/* Prev */}
            <Link
              href={page > 1 ? pageHref(page - 1) : "#"}
              aria-disabled={page <= 1}
              className={`px-3 py-2 rounded-md border text-sm ${
                page <= 1
                  ? "pointer-events-none opacity-40 border-gray-200 dark:border-white/10"
                  : "border-gray-300 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/10 transition"
              }`}
            >
              Prev
            </Link>

            {/* Page numbers (first, last, current ±1) */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((n) => {
                const window = 1;
                return n === 1 || n === totalPages || (n >= page - window && n <= page + window);
              })
              .reduce<number[]>((acc, n, idx, arr) => {
                if (idx === 0) return [n];
                const prev = arr[idx - 1];
                if (n - prev > 1) acc.push(-1);
                acc.push(n);
                return acc;
              }, [])
              .map((n, i) =>
                n === -1 ? (
                  <span key={`gap-${i}`} className="px-2 text-sm text-gray-500 dark:text-white/50">…</span>
                ) : (
                  <Link
                    key={n}
                    href={pageHref(n)}
                    className={`px-3 py-2 rounded-md border text-sm ${
                      n === page
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-white/30 dark:bg-white/10 dark:text-white"
                        : "border-gray-300 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/10"
                    }`}
                  >
                    {n}
                  </Link>
                )
              )}

            {/* Next */}
            <Link
              href={page < totalPages ? pageHref(page + 1) : "#"}
              aria-disabled={page >= totalPages}
              className={`px-3 py-2 rounded-md border text-sm ${
                page >= totalPages
                  ? "pointer-events-none opacity-40 border-gray-200 dark:border-white/10"
                  : "border-gray-300 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/10 transition"
              }`}
            >
              Next
            </Link>
          </nav>
        </div>

        <div className="mt-3">
          <ActionsBar />
        </div>
      </section>
    </div>
  );
}
