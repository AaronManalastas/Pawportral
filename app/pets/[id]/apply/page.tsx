// app/pets/[id]/apply/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import {
  Home,
  Info,
  MapPin,
  MessageSquare,
  Phone,
  ShieldCheck,
  User,
  Image as ImageIcon,
} from "lucide-react";

export const dynamic = "force-dynamic";

/* ----------------------------- Types ----------------------------- */
type PetRow = {
  id: string;
  name: string;
  owner_id: string | null;
  photo_url?: string | null;
};
type ProfileRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  bio: string | null;
};

/* ------------------------ Helpers (address) ---------------------- */
function extractAddress(bio: string | null) {
  if (!bio) return "";
  const m = bio.match(/^\s*Address:\s*(.+)\s*$/im);
  return m ? m[1].trim() : "";
}

/* ====================== Page Component =========================== */
export default async function ApplyToAdoptPage({
  params,
}: {
  params: { id: string };
}) {
  const petId = params.id;
  const supabase = getSupabaseServerClient();

  // Require login (page render)
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/sign-in?next=${encodeURIComponent(`/pets/${petId}/apply`)}`);
  }

  // Fetch pet (need name + owner_id for notif)
  const { data: pet, error: petErr } = await supabase
    .from("pets")
    .select("id,name,owner_id,photo_url")
    .eq("id", petId)
    .maybeSingle<PetRow>();

  if (petErr || !pet) {
    redirect("/adopt");
  }

  // Prefill from profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, phone, bio")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  const initialName = profile?.full_name ?? "";
  const initialPhone = profile?.phone ?? "";
  const initialAddress = extractAddress(profile?.bio ?? null);

  /* -------------------------- Server Action ------------------------- */
  async function submitApplication(formData: FormData) {
    "use server";

    const sb = getSupabaseServerClient();

    // recheck auth
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) {
      redirect(`/sign-in?next=${encodeURIComponent(`/pets/${petId}/apply`)}`);
    }

    // re-fetch pet inside action
    const { data: petRow, error: petInsideErr } = await sb
      .from("pets")
      .select("id, name, owner_id")
      .eq("id", petId)
      .maybeSingle<PetRow>();

    if (petInsideErr || !petRow) {
      redirect(
        `/pets/${petId}/apply?error=${encodeURIComponent("Pet not found.")}`
      );
    }

    // get form values
    const full_name = (formData.get("full_name") || "").toString().trim();
    const phone = (formData.get("phone") || "").toString().trim();
    const full_address = (formData.get("full_address") || "")
      .toString()
      .trim();
    const message = (formData.get("message") || "").toString().trim();

    // 3 ID images (new)
    const barangayFile = formData.get("barangay_clearance") as File | null;
    const policeFile = formData.get("police_clearance") as File | null;
    const primaryFile = formData.get("primary_id") as File | null;

    if (!full_name || !phone || !full_address) {
      redirect(
        `/pets/${petId}/apply?error=${encodeURIComponent(
          "Please complete Full name, Contact number, and Address."
        )}`
      );
    }

    // bucket name na gagamitin
    const BUCKET = "id-uploads";

    // gagamit tayo ng admin client para sure na may write access
    const storageClient =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
        ? createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
          )
        : sb;

    const uploadIfAny = async (
      file: File | null,
      filename: string
    ): Promise<string | null> => {
      if (!file || file.size === 0) return null;

      const arrayBuffer = await file.arrayBuffer();
      // IMPORTANT: use Buffer for Supabase storage in Node
      const buffer = Buffer.from(arrayBuffer);
      const path = `applications/${petRow.id}/${user.id}/${filename}`;

      const { error: upErr } = await storageClient.storage
        .from(BUCKET)
        .upload(path, buffer, {
          contentType: file.type || "image/png",
          upsert: true,
        });

      if (upErr) {
        // this was the hidden error kanina
        const msg = encodeURIComponent("ID upload failed: " + upErr.message);
        redirect(`/pets/${petId}/apply?error=${msg}`);
      }

      const {
        data: { publicUrl },
      } = storageClient.storage.from(BUCKET).getPublicUrl(path);
      return publicUrl;
    };

    // upload 3 IDs
    const barangayUrl = await uploadIfAny(
      barangayFile,
      `barangay-${Date.now()}.jpg`
    );
    const policeUrl = await uploadIfAny(
      policeFile,
      `police-${Date.now()}.jpg`
    );
    const primaryUrl = await uploadIfAny(
      primaryFile,
      `primary-${Date.now()}.jpg`
    );

    // build final message na may mga links
    const extraLines: string[] = [];
    if (barangayUrl) extraLines.push(`Barangay clearance: ${barangayUrl}`);
    if (policeUrl) extraLines.push(`Police/NBI: ${policeUrl}`);
    if (primaryUrl) extraLines.push(`Primary ID: ${primaryUrl}`);

    const finalMessage =
      extraLines.length > 0
        ? [message, "Attached IDs:", ...extraLines].filter(Boolean).join("\n")
        : message;

    // check kung may dati nang application
    const { data: existing } = await sb
      .from("applications")
      .select("id")
      .eq("pet_id", petRow.id)
      .eq("applicant_id", user.id)
      .maybeSingle();

    if (!existing) {
      // FIRST TIME → INSERT
      const { error: insertErr } = await sb.from("applications").insert({
        pet_id: petRow.id,
        applicant_id: user.id,
        status: "pending",
        full_name,
        phone,
        address: full_address,
        message: finalMessage || null,
      });

      if (insertErr) {
        redirect(
          `/pets/${petId}/apply?error=${encodeURIComponent(
            "Unable to submit: " + insertErr.message
          )}`
        );
      }
    } else {
      // MAY LUMA NA → UPDATE para pumasok yung bagong IDs
      await sb
        .from("applications")
        .update({
          status: "pending",
          full_name,
          phone,
          address: full_address,
          message: finalMessage || null,
        })
        .eq("id", existing.id);
    }

    // revalidate pages (yung actual page mo)
    revalidatePath(`/pets/${petRow.id}/applications`);
    revalidatePath("/dashboard");

    // ───────────────────────
    // EMAIL FLOW mo (di ko ginalaw)
    // ───────────────────────
    let ownerEmail: string | null = null;

    // 1) try profiles.email
    try {
      const { data: ownerProfile } = await sb
        .from("profiles")
        .select("email")
        .eq("id", petRow.owner_id)
        .maybeSingle<{ email: string | null }>();
      ownerEmail = ownerProfile?.email ?? null;
    } catch {
      ownerEmail = null;
    }

    // 2) if wala pa rin, use admin client to read auth user
    if (
      !ownerEmail &&
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      petRow.owner_id
    ) {
      try {
        const admin = createAdminClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        const { data, error } = await admin.auth.admin.getUserById(
          petRow.owner_id
        );
        if (!error) {
          ownerEmail = data.user?.email ?? null;
        }
      } catch {
        // ignore
      }
    }

    // 3) final fallback (first admin in env)
    if (!ownerEmail) {
      const fallback =
        (process.env.ADMIN_EMAILS || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)[0] || "";
      ownerEmail = fallback || null;
    }

    // if still none, just go dashboard (wag i-email si applicant)
    if (!ownerEmail) {
      redirect(
        `/dashboard?success=${encodeURIComponent(
          "Application submitted but owner has no email on file."
        )}`
      );
    }

    // build /email-ping URL
    const subject = encodeURIComponent("PawPortal");
    const msg = encodeURIComponent("You Have New Notification");
    const next = encodeURIComponent("/dashboard");
    const recipient = encodeURIComponent(ownerEmail!);
    const name = encodeURIComponent(full_name || "PawPortal");

    redirect(
      `/email-ping?email=${recipient}&name=${name}&subject=${subject}&msg=${msg}&next=${next}`
    );
  }

  /* ------------------------------ UI ------------------------------- */
  return (
    <main className="relative isolate -mt-6 md:-mt-8 lg:-mt-10">
      {/* bg */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(1200px_600px_at_15%_-10%,rgba(124,58,237,0.14),transparent_55%),radial-gradient(1200px_600px_at_85%_-10%,rgba(236,72,153,0.14),transparent_55%)]" />
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.05]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 40px 40px, #000 1px, transparent 1.5px), radial-gradient(circle at 100px 80px, #000 1px, transparent 1.5px), radial-gradient(circle at 160px 40px, #000 1px, transparent 1.5px)",
          backgroundSize: "200px 120px",
          mixBlendMode: "multiply",
        }}
      />

      {/* header */}
      <section className="m-0 border-b border-white/10 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-rose-600">
        <div className="mx-auto max-w-6xl px-6 py-14 text-white">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium tracking-wide backdrop-blur">
                <ShieldCheck className="h-3.5 w-3.5" />
                Adoption application
              </div>
              <h1 className="mt-4 text-4xl sm:text-5xl font-semibold leading-tight tracking-tight">
                Apply to adopt{" "}
                <span className="underline decoration-white/40 underline-offset-4">
                  {pet?.name ?? "this pet"}
                </span>
              </h1>
              <p className="mt-2 max-w-2xl text-white/90">
                Tell the owner a bit about you and why you’d be a great match.
              </p>
            </div>

            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-2xl bg-white/15 px-4 py-2 text-sm font-medium backdrop-blur transition hover:bg-white/20"
            >
              <Home className="h-4 w-4" />
              Home
            </Link>
          </div>
        </div>
      </section>

      {/* card */}
      <section className="mx-auto max-w-4xl px-5">
        <div className="-mt-10 overflow-hidden rounded-[28px] border border-white/25 bg-white/95 shadow-2xl ring-1 ring-black/5 backdrop-blur">
          <div className="h-[3px] w-full rounded-t-[28px] bg-gradient-to-r from-fuchsia-500 via-violet-500 to-pink-500" />

          {/* stepper */}
          <div className="px-6 pt-5">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 font-medium text-indigo-700">
                Your information
              </div>
            </div>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-rose-500" />
            </div>
          </div>

          <form
            action={submitApplication}
            className="p-6 sm:p-8"
            encType="multipart/form-data"
          >
            {/* tip */}
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 text-indigo-900">
              <Info className="mt-0.5 h-5 w-5 text-indigo-500" />
              <p className="text-sm">
                We pre-filled your info from your profile. Double-check your{" "}
                <b>contact number</b> and <b>full address</b> so the pet owner
                can reach you easily.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {/* name */}
              <div className="group">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Full name <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400 transition group-focus-within:text-indigo-500" />
                  <input
                    name="full_name"
                    defaultValue={initialName}
                    placeholder="Juan Dela Cruz"
                    required
                    className="w-full rounded-2xl border border-gray-200 pl-10 pr-3 py-2 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
              </div>

              {/* phone */}
              <div className="group">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Contact number <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400 transition group-focus-within:text-indigo-500" />
                  <input
                    name="phone"
                    defaultValue={initialPhone}
                    inputMode="numeric"
                    placeholder="09XXXXXXXXX"
                    required
                    className="w-full rounded-2xl border border-gray-200 pl-10 pr-3 py-2 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Use your active mobile number (11 digits).
                </p>
              </div>

              {/* address */}
              <div className="group sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Full address <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400 transition group-focus-within:text-indigo-500" />
                  <input
                    name="full_address"
                    defaultValue={initialAddress}
                    placeholder="House No., Street, Barangay, City/Municipality, Province"
                    required
                    className="w-full rounded-2xl border border-gray-200 pl-10 pr-3 py-2 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
              </div>

              {/* NEW: ID uploads */}
              <div className="group sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  ID requirements <span className="text-rose-600">*</span>
                </label>
                <p className="mb-3 text-xs text-gray-500 flex items-center gap-1">
                  <ImageIcon className="h-4 w-4 text-indigo-500" />
                  Upload clear photos/screenshots of these IDs.
                </p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Barangay clearance
                    </label>
                    <input
                      type="file"
                      name="barangay_clearance"
                      accept="image/*"
                      required
                      className="block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs file:mr-2 file:rounded-md file:border-0 file:bg-indigo-600 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Police clearance / NBI
                    </label>
                    <input
                      type="file"
                      name="police_clearance"
                      accept="image/*"
                      required
                      className="block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs file:mr-2 file:rounded-md file:border-0 file:bg-indigo-600 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Any primary ID
                    </label>
                    <input
                      type="file"
                      name="primary_id"
                      accept="image/*"
                      required
                      className="block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs file:mr-2 file:rounded-md file:border-0 file:bg-indigo-600 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white"
                    />
                  </div>
                </div>
                <p className="mt-2 text-[10px] text-gray-400">
                  *Allowed: JPG, PNG. Make sure text is readable.
                </p>
              </div>

              {/* message */}
              <div className="group sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Message to the owner
                </label>
                <div className="relative">
                  <MessageSquare className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-gray-400 transition group-focus-within:text-indigo-500" />
                  <textarea
                    name="message"
                    rows={6}
                    placeholder="Share your home setup, routine, and why you’d be a responsible adopter."
                    className="w-full rounded-2xl border border-gray-200 pl-10 pr-3 py-2 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
              </div>
            </div>

            {/* buttons */}
            <div className="sticky bottom-4 mt-8">
              <div className="rounded-2xl border border-gray-200 bg-white/95 p-3 shadow-lg backdrop-blur">
                <div className="flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <Link
                    href={`/pets/${pet.id}`}
                    className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                  >
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    Submit application
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>

        <div className="h-16" />
      </section>
    </main>
  );
}
