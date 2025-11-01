// app/apply/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

type Search = Record<string, string | string[] | undefined>;
const qp = (sp: Search, key: string) =>
  (Array.isArray(sp?.[key]) ? sp![key]![0] : sp?.[key]) as string | undefined;

export default async function ApplyPage({ searchParams }: { searchParams: Search }) {
  const pet_id = qp(searchParams, "pet_id");
  if (!pet_id) redirect("/adopt");

  const supabase = getSupabaseServerClient();

  // Require login
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const next = encodeURIComponent(`/apply?pet_id=${pet_id}`);
    redirect(`/sign-in?next=${next}`);
  }

  // Load pet (for context)
  const { data: pet } = await supabase
    .from("pets")
    .select("id, name, species, city, photo_url, owner_id, created_at")
    .eq("id", pet_id)
    .single();

  if (!pet) redirect("/adopt");

  // --- server action: submit ---
  async function submit(formData: FormData) {
    "use server";
    const supabase = getSupabaseServerClient();
    const message = (formData.get("message") || "").toString().trim();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      const next = encodeURIComponent(`/apply?pet_id=${pet_id}`);
      redirect(`/sign-in?next=${next}`);
    }

    // 1) prevent duplicates by same user
    const { data: existing } = await supabase
      .from("applications")
      .select("id")
      .eq("pet_id", pet_id)
      .eq("applicant_id", user!.id)
      .maybeSingle();

    if (existing) {
      redirect(`/pets/${pet_id}`); // already applied
    }

    // 2) insert application
    const { error: insertErr } = await supabase.from("applications").insert({
      pet_id,
      applicant_id: user!.id,
      message: message || null,
      status: "pending",
    });

    // if RLS/policy fails, surface a friendly hint
    if (insertErr) {
      const hint =
        "If this persists, check RLS policy on `applications` to allow: auth.uid() = applicant_id for INSERT.";
      const msg = encodeURIComponent(`Unable to submit: ${insertErr.message}. ${hint}`);
      redirect(`/apply?pet_id=${pet_id}&error=${msg}`);
    }

    // refresh admin list (optional) and go back to pet page
    revalidatePath(`/admin/pets/${pet_id}/applications`);
    redirect(`/pets/${pet_id}`);
  }

  const errorText = qp(searchParams, "error");

  return (
    <main className="mx-auto max-w-2xl p-6">
      <Link href={`/pets/${pet.id}`} className="text-sm text-indigo-700 hover:underline">
        ← Back to {pet.name}
      </Link>

      <h1 className="mt-4 text-2xl font-semibold">Apply to adopt {pet.name}</h1>
      <p className="mt-1 text-gray-600">
        Tell the owner a bit about you and why you’d be a good match.
      </p>

      {errorText ? (
        <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-rose-700">
          {decodeURIComponent(errorText)}
        </div>
      ) : null}

      <form action={submit} className="mt-6 space-y-4">
        <textarea
          name="message"
          placeholder="Write a short message…"
          className="h-32 w-full rounded-lg border border-gray-300 p-3 outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
          >
            Submit application
          </button>
          <Link
            href={`/pets/${pet.id}`}
            className="rounded-lg border px-4 py-2 hover:bg-gray-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </main>
  );
}
