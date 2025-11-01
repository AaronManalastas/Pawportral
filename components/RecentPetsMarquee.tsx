import Link from "next/link";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const revalidate = 60;

type PetRow = {
  id: string;
  name: string | null;
  species: string | null;
  city: string | null;
  created_at: string | null;
};

export default async function RecentPetsMarquee() {
  const supabase = getSupabaseServerClient();

  const { data: rows, error } = await supabase
    .from("pets")
    .select("id, name, species, city, created_at")
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    return (
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-red-600">Failed to load pets: {error.message}</p>
      </section>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-lg font-semibold mb-3">Recent &amp; popular</h2>
        <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/60 dark:bg-neutral-900/50 backdrop-blur px-4 py-6 text-sm text-gray-500 dark:text-gray-400">
          No pets found. <Link href="/adopt" className="underline">Browse listings</Link> or{" "}
          <Link href="/dashboard" className="underline">list a pet</Link>.
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <h2 className="text-lg font-semibold mb-3">Recent &amp; popular</h2>
      <div className="overflow-hidden rounded-2xl border border-black/5 dark:border-white/10 bg-white/60 dark:bg-neutral-900/50 backdrop-blur">
        <div className="animate-marquee flex gap-3 py-3 px-3">
          {rows.concat(rows).map((p, i) => {
            const label = `${p.name ?? "Unknown"} • ${p.species ?? "Pet"}${p.city ? ` • ${p.city}` : ""}`;
            return (
              <Link
                href={`/pets/${p.id}`}
                key={`${p.id}-${i}`}
                className="inline-flex items-center gap-2 rounded-full border border-black/10 dark:border-white/10 bg-gradient-to-r from-indigo-600/10 to-fuchsia-600/10 px-3 py-1.5 text-xs font-medium hover:from-indigo-600/20 hover:to-fuchsia-600/20"
              >
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500" />
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
