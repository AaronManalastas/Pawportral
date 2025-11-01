// app/page.tsx
import Link from "next/link";
import RecentPetsMarquee from "../components/RecentPetsMarquee";
import {
  PawPrint,
  Search,
  HeartHandshake,
  ShieldCheck,
  Building2,
  ArrowRight,
  UploadCloud,
  MessageSquare,
  BellRing,
  FileText,
  Clock,
  MapPin,
} from "lucide-react";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import HeroSlideshow from "@/components/HeroSlideshow";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = getSupabaseServerClient();

  // Who's logged in? (to hide user's own pets)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // helper to apply "not adopted" + "not mine" filters
  const excludeAdoptedNotMine = <T extends any>(
    q:
      | ReturnType<ReturnType<typeof getSupabaseServerClient>["from"]>
      | any // typing convenience
  ) => {
    // exclude adopted with a case-agnostic approach
    // (PostgREST: .not('status','in', '(adopted,Adopted,ADOPTED)'))
    q = q.not("status", "in", "(adopted,Adopted,ADOPTED)");
    if (user?.id) q = q.neq("owner_id", user.id);
    return q;
  };

  // ---------------- Hero slideshow (exclude adopted + my own) ----------------
  let heroQuery = supabase
    .from("pets")
    .select("id,name,species,city,photo_url,owner_id,status")
    .not("photo_url", "is", null);
  heroQuery = excludeAdoptedNotMine(heroQuery);

  const { data: heroListRaw } = await heroQuery
    .order("created_at", { ascending: false })
    .limit(10);

  const heroList =
    (heroListRaw ?? []).filter(
      (p) =>
        (!p.status || !/^\s*adopted\s*$/i.test(p.status)) &&
        (!user?.id || p.owner_id !== user.id)
    ) ?? [];

  // ---------------- Stats ----------------
  const { count: petsCount } = await excludeAdoptedNotMine(
    supabase.from("pets").select("id", { count: "exact", head: true })
  );

  const { count: adoptedCount } = await supabase
    .from("pets")
    .select("id", { count: "exact", head: true })
    .in("status", ["adopted", "Adopted", "ADOPTED"]);

  const { count: usersCount } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "user");

  // ---------------- Recent & Popular (exclude adopted + my own) --------------
  // Recent
  let recentQuery = supabase
    .from("pets")
    .select("id,name,species,city,photo_url,created_at,owner_id,status")
    .not("photo_url", "is", null)
    .order("created_at", { ascending: false })
    .limit(12);
  recentQuery = excludeAdoptedNotMine(recentQuery);
  const { data: recentPetsRaw } = await recentQuery;

  // Popular (try views_count, then views) — same filters both branches
  let popularPetsRaw: any[] = [];
  {
    let popularQuery = supabase
      .from("pets")
      .select("id,name,species,city,photo_url,views_count,owner_id,status")
      .not("photo_url", "is", null)
      .order("views_count", { ascending: false })
      .limit(12);
    popularQuery = excludeAdoptedNotMine(popularQuery);

    const tryViewsCount = await popularQuery;

    if (!tryViewsCount.error && tryViewsCount.data) {
      popularPetsRaw = tryViewsCount.data;
    } else {
      let popularFallback = supabase
        .from("pets")
        .select("id,name,species,city,photo_url,views,owner_id,status")
        .not("photo_url", "is", null)
        .order("views", { ascending: false })
        .limit(12);
      popularFallback = excludeAdoptedNotMine(popularFallback);

      const tryViews = await popularFallback;
      if (!tryViews.error && tryViews.data) {
        popularPetsRaw = tryViews.data;
      }
    }
  }

  // Combine recent + popular (unique by id) and apply a FINAL guard filter
  const recentPopularMap = new Map<string, any>();
  (recentPetsRaw ?? []).forEach((p) => recentPopularMap.set(p.id, p));
  (popularPetsRaw ?? []).forEach((p) => {
    if (!recentPopularMap.has(p.id)) recentPopularMap.set(p.id, p);
  });

  const recentPopularItems = Array.from(recentPopularMap.values())
    .filter(
      (p) =>
        (!p.status || !/^\s*adopted\s*$/i.test(p.status)) &&
        (!user?.id || p.owner_id !== user.id)
    )
    .slice(0, 20);

  return (
    <main className="relative overflow-hidden">
      {/* Animations CSS (server-safe) */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes meshMove { 0%{transform:translate3d(-10%,-4%,0) scale(1)} 50%{transform:translate3d(8%,6%,0) scale(1.08)} 100%{transform:translate3d(-10%,-4%,0) scale(1)} }
          @keyframes float { 0%{transform:translateY(0)} 50%{transform:translateY(-10px)} 100%{transform:translateY(0)} }
          @keyframes spinSlow { from{transform:rotate(0)} to{transform:rotate(360deg)} }
          @keyframes shimmer { 0%{background-position:-120% 0} 100%{background-position:120% 0} }
          @keyframes cardLift { from{transform:translateY(0);} to{transform:translateY(-4px);} }
          .btn-shimmer{position:relative;overflow:hidden;isolation:isolate}
          .btn-shimmer::after{content:"";position:absolute;inset:0;background-image:linear-gradient(110deg,transparent 0%,rgba(255,255,255,.25) 40%,rgba(255,255,255,.65) 50%,rgba(255,255,255,.25) 60%,transparent 100%);background-size:220% 100%;animation:shimmer 2.2s infinite;mix-blend-mode:overlay;pointer-events:none}
          .mesh{animation:meshMove 16s ease-in-out infinite;filter:blur(36px)}
          .float{animation:float 6s ease-in-out infinite}
          .float-delay-1{animation-delay:.6s}
          .float-delay-2{animation-delay:1.2s}
          .spin-slow{animation:spinSlow 22s linear infinite}
          .reveal{transform:translateY(10px);opacity:0;animation:fadeUp .7s ease forwards .15s}
          @keyframes fadeUp{to{transform:translateY(0);opacity:1}}
          .card-hover:hover{animation:cardLift .18s ease-out forwards}
          .glass{background:rgba(255,255,255,.72);backdrop-filter:blur(10px)}
          .paw-bg{background:
            radial-gradient(120px 120px at 50% 50%, rgba(0,0,0,.04) 25%, transparent 26%) center/420px 420px repeat;
          }
        `,
        }}
      />

      {/* Animated gradient mesh background */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 z-0 h-[520px] w-[820px] -translate-x-1/2 opacity-60"
      >
        <div className="mesh h-full w-full rounded-[999px] bg-[radial-gradient(50%_60%_at_35%_40%,rgba(99,102,241,0.45),transparent_60%),radial-gradient(40%_50%_at_70%_50%,rgba(217,70,239,0.45),transparent_60%),radial-gradient(45%_55%_at_55%_65%,rgba(139,92,246,0.45),transparent_60%)]" />
      </div>

      {/* HERO */}
      <section className="relative z-10 mx-auto max-w-7xl px-4 pt-14 pb-10 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
          {/* Left block */}
          <div className="space-y-7 lg:col-span-6">
            <GlassBadge icon={<HeartHandshake className="h-3.5 w-3.5" />}>
              PawPortal • Ethical adoption bridge
            </GlassBadge>

            <h1 className="text-[2.9rem] md:text-[3.9rem] font-extrabold leading-[1.03] tracking-tight">
              Bring{" "}
              <span className="bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-violet-600 bg-clip-text text-transparent">
                love &amp; safety
              </span>{" "}
              to pet rehoming.
            </h1>

            <p className="max-w-xl text-[15px] text-gray-700">
              Match with real pets from verified owners &amp; rescues. Apply
              with guided steps, track approvals, and complete handover
              smoothly.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/adopt"
                className="btn-shimmer group inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-fuchsia-300/40 ring-1 ring-black/5 transition hover:opacity-95 active:scale-95"
              >
                <Search className="h-4 w-4" />
                Browse pets
                <span className="ml-0.5 transition-transform group-hover:translate-x-0.5">
                  →
                </span>
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white/85 px-5 py-3 text-sm font-semibold backdrop-blur hover:bg-black/5 transition"
              >
                <UploadCloud className="h-4 w-4" />
                List a pet
              </Link>
            </div>

            {/* chips */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-gray-700">
              <Chip
                icon={<ShieldCheck className="h-3.5 w-3.5" />}
                text="Verified listings"
              />
              <Chip
                icon={<PawPrint className="h-3.5 w-3.5" />}
                text="RTO-friendly process"
              />
              <Chip
                icon={<Building2 className="h-3.5 w-3.5" />}
                text="Rescue-ready docs"
              />
            </div>

            {/* stats */}
            <div className="mt-4 grid grid-cols-3 gap-3 max-w-md">
              <StatCard kpi={`${petsCount ?? 0}`} label="active listings" />
              <StatCard kpi={`${adoptedCount ?? 0}`} label="adoptedPets" />
              <StatCard kpi={`${usersCount ?? 0}`} label="users" />
            </div>

            {/* floating paws */}
            <div className="relative h-0">
              <span className="float absolute -left-6 -top-8 text-2xl opacity-40">
                🐾
              </span>
              <span className="float float-delay-1 absolute left-10 -top-12 text-xl opacity-30">
                🐾
              </span>
              <span className="float float-delay-2 absolute left-24 -top-6 text-2xl opacity-30">
                🐾
              </span>
            </div>
          </div>

          {/* Right: slideshow with reveal */}
          <div className="lg:col-span-6">
            <div className="relative mx-auto max-w-xl">
              <div className="pointer-events-none absolute -inset-2 rounded-[2rem] bg-[conic-gradient(from_160deg,theme(colors.indigo.400/.35),theme(colors.fuchsia.400/.45),theme(colors.violet.400/.35),transparent_70%)] [mask-image:linear-gradient(black,transparent)] blur-[2px]" />
              <div className="reveal relative overflow-hidden rounded-[1.75rem] bg-white/70 border border-black/10 backdrop-blur-xl shadow-[0_25px_60px_-25px_rgba(0,0,0,.35)]">
                <HeroSlideshow items={heroList} intervalMs={2200} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* LIVE activity marquee (Recent & Popular) */}
      {/* @ts-expect-error: allow passing items until RecentPetsMarquee typing is updated */}
      <RecentPetsMarquee items={recentPopularItems} />

      {/* FEATURE GRID */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-center text-2xl font-bold">
          Everything you need for a safe, happy match
        </h2>
        <p className="text-center text-sm text-gray-700 mt-1">
          Built for adopters &amp; owners right where it matters.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <FeatureCard
            icon={<FileText className="h-5 w-5" />}
            title="Guided applications"
            desc="Answer only what’s needed. We format the details owners care about and keep your info secure."
          />
          <FeatureCard
            icon={<MessageSquare className="h-5 w-5" />}
            title="Built-in chat"
            desc="Message safely after approval. Media, read receipts, and unsend without sharing phone numbers."
          />
          <FeatureCard
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Safe handover"
            desc="Checklists, documents, and reminders help both sides complete transfers the right way."
          />
          <FeatureCard
            icon={<BellRing className="h-5 w-5" />}
            title="Real-time updates"
            desc="From application to approval, get notified on every step no refreshing required."
          />
          <FeatureCard
            icon={<Clock className="h-5 w-5" />}
            title="Fast screening"
            desc="Owners see neat profiles and status filters to approve or reject fairly and quickly."
          />
          <FeatureCard
            icon={<MapPin className="h-5 w-5" />}
            title="City-aware search"
            desc="Browse pets near you and plan meetups easily. We highlight distance and location."
          />
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 paw-bg rounded-3xl">
        <h2 className="text-center text-2xl font-bold">
          Loved by adopters & rescues
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <TestimonialCard
            quote="The process was so clear. We applied, got vetted, and brought Milo home in a week."
            name="Kaye & Milo"
            tag="First-time adopters"
          />
          <TestimonialCard
            quote="Reviewing applications is finally painless. No more messy DMs or spreadsheets."
            name="Paws & Co."
            tag="Small rescue org"
          />
          <TestimonialCard
            quote="I loved the checklists during handover. It reminded me of vaccines and microchip docs."
            name="Arvin"
            tag="Previous owner"
          />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <h2 className="text-center text-2xl font-bold">
          How the bridge works
        </h2>
        <p className="text-center text-sm text-gray-700 mt-1">
          One process, two paths—adopters and owners meet in the middle.
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <FlowCard
            title="Adopter path"
            steps={[
              "Browse pets & submit an application",
              "Complete vetting / home-check if required",
              "Get approved and finalize pick-up/transfer",
            ]}
            cta={{ href: "/adopt", label: "Start adopting" }}
          />
          <FlowCard
            title="Owner / rescue path"
            steps={[
              "Create a listing with clear criteria",
              "Review & shortlist applicants fairly",
              "Approve, sign docs, and handover safely",
            ]}
            cta={{ href: "/dashboard", label: "List a pet" }}
            alt
          />
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-violet-600 px-6 py-10 text-center shadow-lg">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_30%,white,transparent_40%),radial-gradient(circle_at_80%_70%,white,transparent_40%)]" />
          <h3 className="relative text-white text-2xl font-bold">
            Bring love home today
          </h3>
          <p className="relative mt-2 text-white/90 text-sm">
            Whether you’re adopting or rehoming responsibly—PawPortal bridges
            the gap.
          </p>
          <div className="relative mt-6 flex items-center justify-center gap-3">
            <Link
              href="/adopt"
              className="rounded-xl bg-white/95 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-white transition"
            >
              Start Browsing
            </Link>
            <Link
              href="/dashboard"
              className="rounded-xl border border-white/40 px-4 py-2 text-sm font-semibold text-white/95 hover:bg-white/10 transition"
            >
              List a Pet
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pb-16">
        <h2 className="text-center text-2xl font-bold">Frequently asked</h2>
        <div className="mt-6 space-y-3">
          <FaqItem q="Is PawPortal free to use?">
            Yes. Browsing, applying, and listing are free. Some rescues may
            require an adoption fee—paid directly to them.
          </FaqItem>
          <FaqItem q="How do you keep adopters and pets safe?">
            Listings are reviewed and we enforce welfare-first rules. Handover
            checklists and document reminders reduce risk.
          </FaqItem>
          <FaqItem q="Can I chat with owners?">
            Chat unlocks after you’re approved for a pet. Both sides can share
            photos and unsend messages if needed.
          </FaqItem>
          <FaqItem q="Do you support rescues?">
            Yes—bulk tools, application filters, and fair screening help rescues
            place pets faster without sacrificing safety.
          </FaqItem>
        </div>
      </section>
    </main>
  );
}

/* ===== UI helpers ===== */

function GlassBadge({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/85 px-3 py-1 text-xs font-medium backdrop-blur">
      <span className="grid h-4 w-4 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white">
        {icon}
      </span>
      {children}
    </span>
  );
}
function Chip({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/85 px-3 py-1 border border-black/10 backdrop-blur">
      {icon}
      {text}
    </span>
  );
}
function StatCard({ kpi, label }: { kpi: string; label: string }) {
  return (
    <div className="rounded-xl border border-black/10 bg-white/85 backdrop-blur p-3 text-center shadow-sm">
      <div className="text-lg font-extrabold bg-gradient-to-r from-indigo-600 to-fuchsia-600 bg-clip-text text-transparent">
        {kpi}
      </div>
      <div className="text-[11px] text-gray-700">{label}</div>
    </div>
  );
}
function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="card-hover rounded-2xl border border-black/10 bg-white/80 p-5 backdrop-blur">
      <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white">
        {icon}
      </div>
      <div className="font-semibold">{title}</div>
      <div className="mt-1 text-sm text-gray-700">{desc}</div>
    </div>
  );
}
function TestimonialCard({
  quote,
  name,
  tag,
}: {
  quote: string;
  name: string;
  tag: string;
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white/85 p-5 backdrop-blur shadow-[0_10px_30px_-15px_rgba(0,0,0,.25)]">
      <div className="text-sm text-gray-800">“{quote}”</div>
      <div className="mt-3 text-sm font-semibold">{name}</div>
      <div className="text-xs text-gray-600">{tag}</div>
    </div>
  );
}
function Badge({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/85 px-3 py-1">
      {icon}
      {children}
    </span>
  );
}
function FlowCard({
  title,
  steps,
  cta,
  alt,
}: {
  title: string;
  steps: string[];
  cta: { href: string; label: string };
  alt?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-2xl p-6 border backdrop-blur",
        alt
          ? "bg-white/80 border-black/5"
          : "bg-gradient-to-b from-indigo-50/60 to-fuchsia-50/60 border-black/5",
      ].join(" ")}
    >
      <h3 className="font-semibold">{title}</h3>
      <ol className="mt-3 space-y-3 text-sm text-gray-700">
        {steps.map((s, i) => (
          <li key={s} className="flex items-start gap-3">
            <span className="mt-0.5 grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-xs font-bold">
              {i + 1}
            </span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
      <Link
        href={cta.href}
        className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-fuchsia-700 hover:underline"
      >
        {cta.label} <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
function FaqItem({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="rounded-xl border border-black/10 bg-white/85 p-4 backdrop-blur">
      <summary className="cursor-pointer list-none select-none text-sm font-semibold">
        {q}
        <span className="ml-2 text-gray-500">+</span>
      </summary>
      <div className="mt-2 text-sm text-gray-700">{children}</div>
    </details>
  );
}
