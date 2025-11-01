// app/pets/[id]/page.tsx
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import Link from "next/link";
import PetGallery from "@/components/PetGallery";
import { redirect } from "next/navigation";
import {
  Phone,
  MapPin,
  Calendar,
  PawPrint,
  ShieldCheck,
} from "lucide-react";
import ZoomableImage from "@/components/ZoomableImage";

export const dynamic = "force-dynamic";

export default async function PetDetail({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const supabase = getSupabaseServerClient();

  // who is viewing
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // get pet (kasama adoption_method, vaccinated, vaccine_proof_url)
  const { data: pet, error } = await supabase
    .from("pets")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !pet) {
    redirect("/adopt?error=Pet%20not%20found");
  }

  // extra photos
  const { data: photos } = await supabase
    .from("pet_photos")
    .select("path, order_index")
    .eq("pet_id", pet.id)
    .order("order_index", { ascending: true });

  const urls = [
    ...(pet.photo_url ? [pet.photo_url] : []),
    ...((photos ?? []).map((p: any) => p.path).filter(Boolean) as string[]),
  ];

  const isOwner = !!user && user.id === pet.owner_id;

  // which tab
  const tabRaw =
    typeof searchParams?.tab === "string"
      ? searchParams.tab.toLowerCase()
      : "details";
  const tab = ["details", "care", "vaccine"].includes(tabRaw)
    ? tabRaw
    : "details";

  // may laman ba care
  const hasAnyCare =
    !!pet.care_title ||
    !!pet.care_feeding ||
    !!pet.care_exercise ||
    !!pet.care_grooming ||
    !!pet.care_notes ||
    !!pet.care_env ||
    !!pet.care_adopter;

  // vaccine img
  const vaccineUrl =
    (pet as any).vaccine_proof_url ||
    (pet as any).pet_vaccine_proof ||
    (pet as any).vaccine_image_url ||
    "";

  return (
    <div className="min-h-screen w-full">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-6 md:px-6 lg:flex-row lg:items-start lg:justify-between lg:py-10">
        {/* LEFT */}
        <div className="w-full lg:w-[55%]">
          <div className="overflow-hidden rounded-[28px] bg-transparent">
            <PetGallery urls={urls} alt={pet.name || "Pet"} />
          </div>
        </div>

        {/* RIGHT */}
        <aside className="w-full lg:w-[42%]">
          <div className="rounded-[28px] bg-white/95 p-6 shadow-[0_18px_35px_rgba(148,120,255,0.15)] ring-1 ring-gray-100/70">
            {/* header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  {pet.name || "Unnamed"}
                </h1>
                <p className="mt-2 flex flex-wrap gap-2 text-sm">
                  <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-3 py-1 text-[11px] font-medium text-purple-700 ring-1 ring-purple-200">
                    <PawPrint className="h-3 w-3" />
                    {pet.species ?? "Pet"}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-[11px] text-slate-700 ring-1 ring-slate-200/70">
                    {pet.sex ?? "—"}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-[11px] text-slate-700 ring-1 ring-slate-200/70">
                    {formatAge(pet.age, pet.age_unit)}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-[11px] text-slate-700 ring-1 ring-slate-200/70">
                    <MapPin className="h-3 w-3 text-purple-400" />
                    {pet.city || "—"}
                  </span>
                </p>
              </div>
              <span className="rounded-full bg-purple-100 px-3 py-1 text-[11px] font-semibold text-purple-700 ring-1 ring-purple-200">
                PawPortal
              </span>
            </div>

            {/* tabs */}
            <div className="mt-6">
              <div className="mb-4 flex gap-3">
                <Link
                  href={`/pets/${pet.id}`}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium ${
                    tab === "details"
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  Pet details
                </Link>
                <Link
                  href={`/pets/${pet.id}?tab=care`}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium ${
                    tab === "care"
                      ? "bg-purple-600 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  Pet care
                </Link>
                <Link
                  href={`/pets/${pet.id}?tab=vaccine`}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium ${
                    tab === "vaccine"
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  Pet vaccine proof
                </Link>
              </div>

              {/* -------- DETAILS TAB -------- */}
              {tab === "details" ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <InfoBox label="Breed" value={pet.breed || "—"} />
                    <InfoBox
                      label="Listed"
                      value={
                        pet.created_at
                          ? new Date(pet.created_at).toLocaleDateString()
                          : "—"
                      }
                      icon={<Calendar className="h-4 w-4 text-purple-400" />}
                    />
                  </div>

                  {/* Adoption + vaccinated */}
                  <div className="grid grid-cols-2 gap-3">
                    <InfoBox
                      label="Adoption method"
                      value={prettyAdoption(pet.adoption_method)}
                      icon={
                        <ShieldCheck className="h-4 w-4 text-indigo-400" />
                      }
                    />
                    <InfoBox
                      label="Vaccinated"
                      value={prettyVaccinated(pet.vaccinated)}
                      icon={
                        <ShieldCheck className="h-4 w-4 text-emerald-400" />
                      }
                    />
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">
                      Owner details
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {pet.owner_full_name || "—"}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-600">
                      <Phone className="h-3 w-3 text-purple-400" />
                      {pet.owner_phone || "No phone number"}
                    </p>
                  </div>

                  {/* About */}
                  <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                    <h2 className="text-sm font-semibold text-slate-900">
                      About
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      {pet.description ||
                        "No description provided. Contact the owner for more details."}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <Link
                      href="/adopt"
                      className="inline-flex flex-1 items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                    >
                      ← Back to list
                    </Link>
                    {(!user || user.id !== pet.owner_id) && (
                      <Link
                        href={`/pets/${pet.id}/apply`}
                        className="inline-flex flex-1 items-center justify-center rounded-xl bg-purple-500 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-600"
                      >
                        Apply to adopt
                      </Link>
                    )}
                    {isOwner ? (
                      <Link
                        href={`/pets/${pet.id}/edit`}
                        className="inline-flex flex-1 items-center justify-center rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600"
                      >
                        Edit / Delete
                      </Link>
                    ) : null}
                  </div>
                </div>
              ) : tab === "care" ? (
                /* -------- PET CARE TAB -------- */
                <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                  <h3 className="mb-3 text-sm font-semibold text-slate-900">
                    Pet care
                  </h3>
                  {hasAnyCare ? (
                    <>
                      <CareRow label="Medical notes" value={pet.care_title} />
                      <CareRow
                        label="Feeding / diet"
                        value={pet.care_feeding}
                      />
                      <CareRow
                        label="Exercise / enrichment"
                        value={pet.care_exercise}
                      />
                      <CareRow
                        label="Health / grooming"
                        value={pet.care_grooming}
                      />
                      <CareRow
                        label="Extra notes / temperament"
                        value={pet.care_notes}
                      />
                      <CareRow
                        label="Living environment"
                        value={pet.care_env}
                      />
                      <CareRow
                        label="Recommended adopter"
                        value={pet.care_adopter}
                      />
                    </>
                  ) : (
                    <div className="rounded-2xl bg-white/70 p-6 text-center text-sm text-slate-500">
                      No care guide provided for this pet.
                      {isOwner ? (
                        <p className="mt-1 text-xs text-slate-400">
                          (Add one by editing this pet in your dashboard.)
                        </p>
                      ) : null}
                    </div>
                  )}

                  <div className="mt-4 flex gap-3">
                    <Link
                      href="/adopt"
                      className="inline-flex flex-1 items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                    >
                      ← Back to list
                    </Link>
                    {isOwner ? (
                      <Link
                        href={`/pets/${pet.id}/edit`}
                        className="inline-flex flex-1 items-center justify-center rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600"
                      >
                        Edit / Delete
                      </Link>
                    ) : null}
                  </div>
                </div>
              ) : (
                /* -------- VACCINE PROOF TAB -------- */
                <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                  <h3 className="mb-3 text-sm font-semibold text-slate-900">
                    Pet vaccine proof
                  </h3>

                  {vaccineUrl ? (
                    <div className="overflow-hidden rounded-2xl border bg-white/70">
                      <ZoomableImage src={vaccineUrl} alt="Pet vaccine proof" />
                      <div className="border-t p-3 text-xs text-slate-500">
                        This proof was uploaded by the owner. Click to zoom.
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-white/70 p-6 text-center text-sm text-slate-500">
                      No vaccine proof uploaded for this pet.
                      {isOwner ? (
                        <p className="mt-1 text-xs text-slate-400">
                          (Upload one in your dashboard.)
                        </p>
                      ) : null}
                    </div>
                  )}

                  <div className="mt-4 flex gap-3">
                    <Link
                      href="/adopt"
                      className="inline-flex flex-1 items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                    >
                      ← Back to list
                    </Link>
                    {isOwner ? (
                      <Link
                        href={`/pets/${pet.id}/edit`}
                        className="inline-flex flex-1 items-center justify-center rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600"
                      >
                        Edit / Delete
                      </Link>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function CareRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="mb-3">
      <p className="text-[10px] uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 whitespace-pre-line text-sm text-slate-800">
        {value && value.trim() !== "" ? value : "—"}
      </p>
    </div>
  );
}

function InfoBox({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 flex items-center gap-1 text-sm text-slate-900">
        {icon}
        {value}
      </p>
    </div>
  );
}

// ✅ FIXED AGE DISPLAY
function formatAge(age: any, unit: any) {
  if (age == null) return "—";
  const n = Number(age);
  const u = (unit || "").toLowerCase();

  // kung talagang naka-months sa DB
  if (u.includes("month")) {
    const m = Math.round(n); // para 5.2 -> 5
    return m === 1 ? "1 month" : `${m} months`;
  }

  // kung naka-years pero mas mababa sa 1 year (0.42, 0.75, etc.)
  if (!u || u === "year" || u === "years") {
    if (n < 1) {
      const months = Math.round(n * 12);
      const safeMonths = Math.max(months, 1); // para hindi 0 months
      return safeMonths === 1 ? "1 month" : `${safeMonths} months`;
    }
    return n === 1 ? "1 year" : `${n} years`;
  }

  // fallback
  return `${n} ${u}`;
}

function prettyAdoption(v: any) {
  if (!v) return "—";
  const x = String(v).toLowerCase();
  if (x === "pick up" || x === "pickup" || x === "pick_up") return "Pick up";
  if (x === "home deliver" || x === "home_delivery" || x === "delivery")
    return "Home delivery";
  return v;
}

function prettyVaccinated(v: any) {
  if (!v) return "—";
  const x = String(v).toLowerCase();
  if (x === "yes" || x === "true" || x === "vaccinated") return "Yes";
  if (x === "no" || x === "false") return "No";
  return v;
}
