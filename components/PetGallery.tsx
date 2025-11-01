"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type Props = {
  urls: string[];
  alt?: string;
};

export default function PetGallery({ urls, alt = "Pet photo" }: Props) {
  // Dedupe while preserving order
  const unique = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const u of urls || []) {
      if (!u || seen.has(u)) continue;
      seen.add(u);
      out.push(u);
    }
    return out;
  }, [urls]);

  const [active, setActive] = useState(0);
  useEffect(() => {
    if (active > unique.length - 1) setActive(0);
  }, [unique, active]);

  if (!unique.length) return null;

  const main = unique[active];

  // Prevent any default “zoom/drag/open image” behavior
  const stop = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className="space-y-3">
      {/* MAIN IMAGE (non-interactive + capped height) */}
      <div className="overflow-hidden rounded-2xl border bg-white/70">
        <Image
          src={main}
          alt={alt}
          width={1600}
          height={1000}
          // max-h keeps it from getting huge; pointer/select/draggable prevent interaction
          className="w-full h-auto max-h-[70vh] object-cover pointer-events-none select-none"
          unoptimized
          priority
          draggable={false}
          onContextMenu={stop}
          onDragStart={stop}
          onMouseDown={stop}
        />
      </div>

      {/* THUMB STRIP BELOW */}
      {unique.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-1" role="listbox" aria-label="Pet photos">
          {unique.map((u, i) => {
            const isActive = i === active;
            return (
              <button
                key={u + i}
                type="button"
                onClick={() => setActive(i)}
                className={[
                  "relative h-20 w-28 shrink-0 overflow-hidden rounded-xl border bg-white/70",
                  "focus:outline-none focus:ring-2 focus:ring-indigo-500",
                  isActive ? "ring-2 ring-indigo-500" : "hover:ring-1 hover:ring-gray-300",
                ].join(" ")}
                aria-selected={isActive}
                aria-label={`Show photo ${i + 1}`}
                title={`Show photo ${i + 1}`}
              >
                <Image
                  src={u}
                  alt={`${alt} ${i + 1}`}
                  width={448}
                  height={320}
                  className="h-full w-full object-cover"
                  unoptimized
                  draggable={false}
                  onContextMenu={stop}
                  onDragStart={stop}
                />
                {isActive && (
                  <span className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-inset ring-indigo-500/80" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
