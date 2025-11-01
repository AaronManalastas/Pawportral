// app/pets/[id]/edit/page.tsx
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

type Pet = {
  id: string;
  name: string;
  species: string | null;
  breed: string | null;
  sex: string | null;
  age: number | null;
  city: string | null;
  description: string | null;
  photo_url: string | null;
  owner_id: string;
};

export default async function EditPetPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  // Load the pet
  const { data: pet, error } = await supabase
    .from("pets")
    .select("*")
    .eq("id", params.id)
    .single<Pet>();

  if (error || !pet) redirect("/dashboard?error=Pet%20not%20found");
  if (pet.owner_id !== user.id) redirect(`/pets/${pet.id}`);

  // ——— server action: update
  async function updatePet(formData: FormData) {
    "use server";
    const supabase = getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/sign-in");

    const petId = (formData.get("pet_id") || "").toString();

    const name = (formData.get("name") || "").toString().trim();
    const species = (formData.get("species") || "").toString().trim();
    const breed = (formData.get("breed") || "").toString().trim();
    const sex = (formData.get("sex") || "").toString().trim();
    const ageRaw = (formData.get("age") || "").toString().trim();
    const age = ageRaw === "" ? null : Number(ageRaw);
    const city = (formData.get("city") || "").toString().trim();
    const description = (formData.get("description") || "").toString().trim();
    const file = formData.get("photo") as File | null;
    const removePhoto = (formData.get("remove_photo") || "").toString() === "on";

    // Build updates
    const updates: Partial<Pet> = {
      name,
      species: species ? species.toLowerCase() : null,
      breed: breed || null,
      sex: sex ? sex.toLowerCase() : null,
      age,
      city: city || null,
      description: description || null,
    };

    // Photo: remove or replace
    if (removePhoto) {
      updates.photo_url = null;
    } else if (file && file.size > 0) {
      const ext =
        file.name.split(".").pop()?.toLowerCase().replace(/[^\w]/g, "") || "jpg";
      const path = `${user.id}/${randomUUID()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("pet-photos")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: file.type || "image/jpeg",
        });
      if (!uploadErr) {
        const { data: pub } = supabase.storage.from("pet-photos").getPublicUrl(path);
        updates.photo_url = pub?.publicUrl ?? null;
      }
    }

    // Update (owner locked)
    const { error: updateErr } = await supabase
      .from("pets")
      .update(updates)
      .eq("id", petId)
      .eq("owner_id", user.id);

    if (updateErr) {
      redirect(
        `/pets/${petId}/edit?error=${encodeURIComponent(updateErr.message)}`
      );
    }

    // Revalidate & go back
    revalidatePath("/adopt");
    revalidatePath("/dashboard");
    redirect(
      `/dashboard?success=${encodeURIComponent("Pet information updated.")}`
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Edit pet</h1>
        <Link
          href="/dashboard"
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          Back to dashboard
        </Link>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <form action={updatePet} encType="multipart/form-data" className="grid grid-cols-1 gap-4">
          <input type="hidden" name="pet_id" value={pet.id} />

          {/* current photo */}
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 overflow-hidden rounded-lg bg-gray-100 ring-1 ring-gray-200">
              {pet.photo_url ? (
                <Image
                  src={pet.photo_url}
                  alt={pet.name}
                  width={80}
                  height={80}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="grid h-full w-full place-items-center text-gray-400">
                  🐾
                </div>
              )}
            </div>
            <div className="text-sm text-gray-600">
              <div className="font-medium">{pet.name}</div>
              <div className="text-xs">Current photo</div>
            </div>
          </div>

          <TextField name="name" label="Name *" defaultValue={pet.name} required />
          <SelectField
            name="species"
            label="Species *"
            defaultValue={pet.species || ""}
            options={["Dog", "Cat", "Other"]}
            required
          />
          <TextField name="breed" label="Breed" defaultValue={pet.breed || ""} />
          <SelectField
            name="sex"
            label="Sex"
            defaultValue={pet.sex || ""}
            options={["Male", "Female", "Unknown"]}
          />
          <NumberField
            name="age"
            label="Age (years)"
            min={0}
            step={0.1}
            defaultValue={pet.age ?? undefined}
          />
          <TextField name="city" label="City / Location" defaultValue={pet.city || ""} />

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              name="description"
              rows={4}
              defaultValue={pet.description || ""}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Temperament, vaccination, special notes…"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Replace photo</label>
            <input
              type="file"
              name="photo"
              accept="image/*"
              className="mt-1 block w-full text-sm text-gray-900 file:mr-4 file:rounded-md file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-white hover:file:bg-indigo-700"
            />
            <div className="mt-2 flex items-center gap-2 text-sm">
              <input id="remove_photo" name="remove_photo" type="checkbox" className="h-4 w-4 rounded border-gray-300" />
              <label htmlFor="remove_photo" className="text-gray-700">
                Remove current photo
              </label>
            </div>
            <p className="mt-1 text-xs text-gray-500">JPEG/PNG, up to ~5MB.</p>
          </div>

          <div className="mt-2 flex items-center gap-3">
            <button
              type="submit"
              className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
            >
              Save changes
            </button>
            <Link href="/dashboard" className="rounded-md border px-4 py-2 hover:bg-gray-50">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ————— inputs ————— */

function TextField(
  props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }
) {
  const { label, ...rest } = props;
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input
        {...rest}
        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );
}

function NumberField(
  props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }
) {
  return <TextField {...props} type="number" />;
}

function SelectField({
  name,
  label,
  options,
  required,
  defaultValue,
}: {
  name: string;
  label: string;
  options: string[];
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <select
        name={name}
        required={required}
        defaultValue={defaultValue || ""}
        className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="">{required ? "Select…" : "—"}</option>
        {options.map((o) => (
          <option key={o.toLowerCase()} value={o.toLowerCase()}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
