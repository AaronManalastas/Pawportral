"use client";

import Image from "next/image";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function AboutPage() {
  return (
    <main className="relative">
      {/* Simple page header (neutral) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10 pb-6">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-black/5 dark:bg-white/10 px-3 py-1 text-xs text-gray-700 dark:text-gray-200">
            🐾 PawPortal • Ethical adoption bridge
          </span>
          <h1 className="mt-4 text-4xl md:text-5xl font-extrabold tracking-tight">
            About <span className="text-gray-900 dark:text-gray-100">PawPortal</span>
          </h1>
          <p className="mx-auto mt-3 max-w-3xl text-sm md:text-base text-gray-700 dark:text-gray-300">
            PawPortal is an ethical adoption bridge built to connect loving pet owners, adopters, and rescues.
            We aim to create a safe, transparent, and community-driven platform for rehoming pets.
          </p>
        </div>
      </section>

      {/* Mission / Vision */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-10">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <h3 className="font-semibold">Our Mission</h3>
            <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
              To ensure every pet finds a safe and loving home through a guided, transparent adoption process—
              while empowering owners, adopters, and rescues with trust and convenience.
            </p>
          </Card>
          <Card>
            <h3 className="font-semibold">Our Vision</h3>
            <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
              A future where ethical pet adoption is the norm—every furry friend has a safe home, and rehoming is seamless,
              secure, and filled with compassion.
            </p>
          </Card>
        </div>
      </section>

      {/* Core Values (neutral) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-8">
        <h2 className="text-center text-2xl md:text-3xl font-bold">Our Core Values</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <ValueCard title="Compassion" desc="Treating pets and people with empathy and care." />
          <ValueCard title="Community" desc="Building trust across owners, adopters, and rescues." />
          <ValueCard title="Transparency" desc="Open communication and verified adoption processes." />
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Feature title="Verified Profiles" desc="All adopters and owners go through checks to ensure safe adoptions." />
          <Feature title="Safe Messaging" desc="Secure channel for both parties, with media and controls." />
          <Feature title="Admin Moderation" desc="Our team reviews posts and flags suspicious activity." />
        </div>
      </section>

      {/* The Creators – updated names & roles */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <h2 className="text-center text-2xl md:text-3xl font-bold">The Creators</h2>
        <p className="mt-1 text-center text-sm text-gray-600 dark:text-gray-400">
          Meet the team behind PawPortal.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Creator img="/hydro.jpg" initials="HV" name="Hydro Vasquez" role="UI/UX & Frontend" />
          <Creator img="/aron.jpg" initials="AM" name="Aaron Manalastas" role="Project Lead • Full-stack" />
          <Creator img="/bam.jpg" initials="RK" name="Richard Keeler" role="Backend & Database" />
        </div>
      </section>

      {/* Trusted Facebook Adoption Pages */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-12">
        <h2 className="text-center text-2xl md:text-3xl font-bold">Trusted Facebook Adoption Pages</h2>
        <p className="mt-1 text-center text-sm text-gray-600 dark:text-gray-400">
          Adopt responsibly. Always verify posts and follow each group’s adoption policies.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <FbCard title="PAWS Philippines" tag="Animal Welfare & Adoptions" href="https://www.facebook.com/pawsphilippines" />
          <FbCard title="CARA Welfare Philippines" tag="Rescue & Adoption" href="https://www.facebook.com/CARAwelfareph" />
          <FbCard title="Pawssion Project" tag="Shelter & Adoption" href="https://www.facebook.com/PawssionProject" />
          <FbCard title="Philippine Animal Rescue Team (PART)" tag="Rescue & Adoption" href="https://www.facebook.com/philanimalrescue" />
          <FbCard title="Animal Kingdom Foundation (AKF)" tag="Rescue & Advocacy" href="https://www.facebook.com/akfanimalrescue" />
          <FbCard title="Dogs of Manila Adoption" tag="Community Group" href="https://www.facebook.com/groups/570927073782742" />
        </div>
      </section>

      {/* CTA banner (purple) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-14">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-violet-600 text-white px-6 py-10 text-center shadow-lg">
          <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_20%_30%,white,transparent_40%),radial-gradient(circle_at_80%_70%,white,transparent_40%)]" />
          <h3 className="relative text-2xl font-bold">Join us in creating a safe adoption bridge.</h3>
          <p className="relative mt-2 text-white/90 text-sm">
            Whether you’re looking to adopt, rehome, or support — PawPortal makes it easy, safe, and compassionate.
          </p>
          <div className="relative mt-6 flex items-center justify-center gap-3">
            <Link
              href="/adopt"
              className="rounded-xl bg-white/95 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-white transition"
            >
              Adopt a Pet
            </Link>
            <Link
              href="/dashboard"
              className="rounded-xl border border-white/50 px-4 py-2 text-sm font-semibold text-white/95 hover:bg-white/10 transition"
            >
              List a Pet
            </Link>
          </div>
        </div>
      </section>
      {/* No footer on this page */}
    </main>
  );
}

/* ---------- helpers ---------- */

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/85 dark:bg-neutral-900/70 p-6 backdrop-blur">
      {children}
    </div>
  );
}

function ValueCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/85 dark:bg-neutral-900/70 p-5 backdrop-blur">
      <div className="mb-2 inline-grid h-9 w-9 place-items-center rounded-xl bg-black/5 dark:bg-white/10">✨</div>
      <div className="font-semibold">{title}</div>
      <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{desc}</p>
    </div>
  );
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/85 dark:bg-neutral-900/70 p-5 backdrop-blur">
      <div className="mb-2 inline-grid h-9 w-9 place-items-center rounded-xl bg-black/5 dark:bg-white/10">🛡️</div>
      <div className="font-semibold">{title}</div>
      <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">{desc}</div>
    </div>
  );
}

function Creator({
  img,
  initials,
  name,
  role,
}: {
  img: string;
  initials: string;
  name: string;
  role: string;
}) {
  return (
    <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/85 dark:bg-neutral-900/70 p-5 backdrop-blur">
      <div className="flex items-center gap-4">
        <div className="relative h-14 w-14 overflow-hidden rounded-full ring-1 ring-black/10 dark:ring-white/10">
          <Image
            src={img}
            alt={name}
            fill
            sizes="56px"
            className="object-cover"
            onError={(e) => {
              const el = (e.target as HTMLImageElement).parentElement!;
              el.innerHTML = `<div style="display:grid;place-items:center;height:100%;width:100%;background:#f3e8ff;color:#7c3aed;font-weight:700;">${initials}</div>`;
            }}
          />
        </div>
        <div>
          <div className="font-semibold">{name}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">{role}</div>
        </div>
      </div>
    </div>
  );
}

function FbCard({ title, tag, href }: { title: string; tag: string; href: string }) {
  return (
    <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/85 dark:bg-neutral-900/70 p-5 backdrop-blur">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-semibold">{title}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">{tag}</div>
        </div>
        <span className="inline-grid h-7 w-7 place-items-center rounded-lg bg-fuchsia-600 text-white text-sm">f</span>
      </div>
      <Link
        href={href}
        target="_blank"
        className="mt-4 inline-flex items-center gap-2 rounded-lg border border-black/10 dark:border-white/10 px-3 py-1.5 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5"
      >
        Visit on Facebook
      </Link>
    </div>
  );
}
