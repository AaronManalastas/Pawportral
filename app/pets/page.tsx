// app/pets/page.tsx
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PetsPage() {
  const supabase = getSupabaseServerClient();

  const { data: pets, error } = await supabase
    .from("pets")
    .select("id, name, species, city, photo_url, status, created_at")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pets</h1>
          <p className="text-sm text-gray-600">
            All pets currently listed in PawPortal.
          </p>
        </div>

        <Link
          href="/dashboard#add"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Add pet
        </Link>
      </div>

      {error ? (
        <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-rose-700">
          Failed to load pets: {error.message}
        </div>
      ) : !pets || pets.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-white/70 p-10 text-center">
          <h2 className="text-lg font-medium">No pets yet</h2>
          <p className="mt-1 text-gray-600">
            Add a pet from your dashboard to see it here.
          </p>
          <Link
            href="/dashboard#add"
            className="mt-4 inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
          >
            Add pet
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pets.map((pet) => (
            <div
              key={pet.id}
              className="overflow-hidden rounded-2xl border bg-white/90 shadow-sm flex flex-col"
            >
              <div className="h-40 w-full bg-gray-100 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pet.photo_url || "/placeholder-pet.png"}
                  alt={pet.name || "Pet"}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="p-4 flex-1 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-medium capitalize">
                    {pet.name || "Unnamed pet"}
                  </h2>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ${
                      (pet.status || "").toLowerCase() === "adopted"
                        ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                        : "bg-amber-50 text-amber-700 ring-amber-200"
                    }`}
                  >
                    {pet.status || "pending"}
                  </span>
                </div>
                <p className="text-sm text-gray-500 capitalize">
                  {pet.species || "pet"} • {pet.city || "No location"}
                </p>
                <Link
                  href={`/pets/${pet.id}`}
                  className="mt-auto inline-flex items-center justify-center rounded-lg bg-indigo-50 px-3 py-1.5 text-sm text-indigo-700 hover:bg-indigo-100"
                >
                  View details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
