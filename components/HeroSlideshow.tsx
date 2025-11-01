// app/components/HeroSlideshow.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Pet = {
  id: string;
  name: string | null;
  species: string | null;
  city: string | null;
  photo_url: string | null;
};

export default function HeroSlideshow({
  items,
  intervalMs = 2000,
}: {
  items: Pet[];
  intervalMs?: number;
}) {
  const slides = useMemo(
    () => (items ?? []).filter((p) => p.photo_url),
    [items]
  );

  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setInterval(
      () => setIdx((i) => (i + 1) % slides.length),
      Math.max(1200, intervalMs)
    );
    return () => clearInterval(id);
  }, [slides.length, intervalMs]);

  // Preload next image for smoother transition
  useEffect(() => {
    const next = slides[(idx + 1) % slides.length];
    if (next?.photo_url) {
      const img = new window.Image();
      img.src = next.photo_url;
    }
  }, [idx, slides]);

  if (!slides.length) {
    return <div className="grid h-[26rem] md:h-[32rem] place-items-center text-5xl">🐾</div>;
  }

  const current = slides[idx];

  return (
    <div className="relative">
      {/* image stack with crossfade */}
      <div className="relative h-[26rem] md:h-[32rem]">
        {slides.map((p, i) => (
          <Image
            key={p.id}
            src={p.photo_url!}
            alt={p.name ?? "Adoptable pet"}
            fill
            sizes="(max-width: 768px) 100vw, 600px"
            className={`absolute inset-0 object-cover transition-opacity duration-700 ${
              i === idx ? "opacity-100" : "opacity-0"
            }`}
            priority={i === idx}
            unoptimized
          />
        ))}
      </div>

      {/* caption bar */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-black/10 dark:border-white/10 bg-white/85 dark:bg-neutral-900/60">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">
            {current.name ?? "Featured pet"}
          </div>
          <div className="truncate text-xs text-gray-600 dark:text-gray-400">
            {(current.species ?? "Pet") + (current.city ? ` • ${current.city}` : "")}
          </div>
        </div>
        <Link
          href={`/pets/${current.id}`}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-95"
        >
          View details <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
