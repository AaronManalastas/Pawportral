// app/pets/[id]/chat/page.tsx
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import ChatRoom from "@/components/chat/ChatRoom";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PetChatPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = getSupabaseServerClient();

  // ---- Auth ----
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  // ---- Pet ----
  const { data: pet, error: petErr } = await supabase
    .from("pets")
    .select("id, name, photo_url, owner_id")
    .eq("id", params.id)
    .single();

  if (petErr || !pet) {
    redirect(
      "/dashboard?error=" +
        encodeURIComponent(petErr?.message || "Pet not found.")
    );
  }

  // ---- Your application for this pet (any status) ----
  const { data: myAnyApp, error: anyAppErr } = await supabase
    .from("applications")
    .select("id, applicant_id, status, created_at, full_name")
    .eq("pet_id", pet.id)
    .eq("applicant_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (anyAppErr) {
    redirect("/dashboard?error=" + encodeURIComponent(anyAppErr.message));
  }

  // ---- Also fetch the latest approved adopter (used when OWNER opens chat) ----
  const { data: approved, error: appErr } = await supabase
    .from("applications")
    .select("id, applicant_id, status, created_at, full_name")
    .eq("pet_id", pet.id)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (appErr) {
    redirect("/dashboard?error=" + encodeURIComponent(appErr.message));
  }

  // ---- Access rule: owner OR any applicant ----
  const allowed = user.id === pet.owner_id || !!myAnyApp;
  if (!allowed) {
    redirect(
      "/dashboard?error=" +
        encodeURIComponent("You need to apply to chat with the owner.")
    );
  }

  // Determine which adopter this conversation is with
  let targetAdopterId: string | undefined =
    myAnyApp?.applicant_id || approved?.applicant_id;

  if (!targetAdopterId) {
    redirect(
      `/pets/${pet.id}/applications?error=` +
        encodeURIComponent("Select an application to chat with.")
    );
  }

  // ---- Ensure conversation row exists (owner + target adopter) ----
  const { data: convo } = await supabase
    .from("conversations")
    .select("id")
    .eq("pet_id", pet.id)
    .eq("owner_id", pet.owner_id)
    .eq("adopter_id", targetAdopterId)
    .maybeSingle();

  let conversationId = convo?.id as string | undefined;

  if (!conversationId) {
    const { data: created, error: cErr } = await supabase
      .from("conversations")
      .insert({
        pet_id: pet.id,
        owner_id: pet.owner_id,
        adopter_id: targetAdopterId,
      })
      .select("id")
      .single();

    if (cErr || !created) {
      redirect(
        "/dashboard?error=" +
          encodeURIComponent(cErr?.message || "Failed to create conversation.")
      );
    }
    conversationId = created.id;
  }

  // ---- Initial messages ----
  const { data: initialMessages, error: msgErr } = await supabase
    .from("messages")
    .select("id, conversation_id, sender_id, body, created_at")
    .eq("conversation_id", conversationId!)
    .order("created_at", { ascending: true });

  if (msgErr) {
    redirect("/dashboard?error=" + encodeURIComponent(msgErr.message));
  }

  // ---- Compute chat partner (owner ↔ adopter) and fetch their profile name ----
  const chatPartnerId =
    user.id === pet.owner_id ? targetAdopterId! : pet.owner_id;

  const { data: partnerProfile } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("id", chatPartnerId)
    .single();

  const partnerName = partnerProfile?.full_name || "User";

  // (kept for compatibility)
  const adopterName: string | null =
    (myAnyApp as any)?.full_name
      ? String((myAnyApp as any).full_name)
      : (approved as any)?.full_name
      ? String((approved as any).full_name)
      : null;

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 overflow-hidden rounded-xl bg-gray-100 ring-1 ring-gray-200">
            {pet.photo_url ? (
              <Image
                src={pet.photo_url}
                alt={pet.name ?? "Pet"}
                width={48}
                height={48}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : (
              <div className="grid h-full w-full place-items-center text-gray-400">
                🐾
              </div>
            )}
          </div>
          <div>
            <h1 className="text-lg font-semibold">
              Chat about {pet.name ?? "this pet"}{" "}
              <span className="text-gray-600">— </span>
              {/* 🔗 point to your existing /users/[id] route */}
              <Link
                href={`/users/${chatPartnerId}`}
                className="text-indigo-700 hover:underline"
                prefetch={false}
              >
                {partnerName}
              </Link>
            </h1>
          </div>
        </div>
        <Link
          href="/dashboard"
          className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          Back
        </Link>
      </div>

      {/* Mark this conversation as read on page load */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            fetch('/api/chat/read', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ conversation_id: '${conversationId}' })
            }).catch(()=>{});
          `,
        }}
      />

      {/* Chat room */}
      <ChatRoom
        conversationId={conversationId!}
        currentUserId={user.id}
        initialMessages={initialMessages ?? []}
      />
    </div>
  );
}
