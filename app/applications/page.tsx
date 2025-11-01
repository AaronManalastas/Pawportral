// app/applications/page.tsx
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type AppRow = {
  id: string;
  pet_id: string;
  status: string;
  message?: string | null;
  created_at: string;
  pets?: { name?: string | null; photo_url?: string | null } | null;
};

export default async function ApplicationsPage() {
  const supabase = getSupabaseServerClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr) redirect("/sign-in?error=" + encodeURIComponent(userErr.message));
  if (!user) redirect("/sign-in");

  // Try applicant_id first
  let applications: AppRow[] = [];
  const { data: appsA } = await supabase
    .from("applications")
    .select(
      "id, pet_id, status, message, created_at, pets(name, photo_url)"
    )
    .eq("applicant_id", user.id)
    .order("created_at", { ascending: false });

  if (appsA && appsA.length) {
    applications = appsA as AppRow[];
  } else {
    // Fallback for schemas using user_id
    const { data: appsB } = await supabase
      .from("applications")
      .select("id, pet_id, status, message, created_at, pets(name, photo_url)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    applications = (appsB as AppRow[] | null) ?? [];
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-semibold mb-4">Your Applications</h1>

      {applications.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          No applications.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {applications.map((a) => (
            <div
              key={a.id}
              className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 overflow-hidden rounded-lg bg-gray-100 ring-1 ring-gray-200">
                    {a.pets?.photo_url ? (
                      <Image
                        src={a.pets.photo_url}
                        alt={a.pets?.name || "Pet"}
                        width={48}
                        height={48}
                        className="h-full w-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-gray-400">
                        🐶
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium leading-tight">
                      {a.pets?.name ?? `Pet #${a.pet_id}`}
                    </h3>
                    <p className="text-xs text-gray-500">
                      Applied {new Date(a.created_at).toLocaleDateString()}
                    </p>
                    {a.message ? (
                      <p className="mt-1 text-xs text-gray-600">Note: {a.message}</p>
                    ) : null}
                  </div>
                </div>
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 ring-1 ring-amber-200">
                  {a.status}
                </span>
              </div>

              <div className="mt-3 flex items-center justify-end gap-2">
                <Link
                  href={`/pets/${a.pet_id}`}
                  className="text-indigo-700 text-sm hover:underline"
                >
                  View pet
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
