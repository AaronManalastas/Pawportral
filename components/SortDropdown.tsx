// components/SortDropdown.tsx
"use client";

import { useCallback, useMemo } from "react";

export default function SortDropdown({
  species,
  q,
  current,
}: {
  species?: string;
  q?: string;
  current: "newest" | "oldest";
}) {
  const label = useMemo(
    () => (current === "oldest" ? "Oldest first" : "Newest first"),
    [current]
  );

  const onChange = useCallback<React.ChangeEventHandler<HTMLSelectElement>>(
    (e) => {
      const next = e.target.value as "newest" | "oldest";
      const params = new URLSearchParams(window.location.search);

      if (species) params.set("species", species);
      else params.delete("species");

      if (q) params.set("q", q);
      else params.delete("q");

      params.set("sort", next);
      params.delete("page"); // when sorting changes, start at page 1

      const qs = params.toString();
      window.location.assign(qs ? `/adopt?${qs}` : "/adopt");
    },
    [species, q]
  );

  return (
    <div className="relative rounded-full bg-white px-3 py-1 text-xs text-gray-700 ring-1 ring-black/10">
      <span className="pr-5">{label}</span>
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-600"
      >
        <path d="M6 8l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      {/* invisible native select overlay so click opens options immediately */}
      <select
        aria-label="Sort pets"
        value={current}
        onChange={onChange}
        className="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0"
      >
        <option value="newest">Newest first</option>
        <option value="oldest">Oldest first</option>
      </select>
    </div>
  );
}
