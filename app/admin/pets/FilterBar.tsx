'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';

type Props = {
  ptype: string;   // 'all' | 'dog' | 'cat' | 'other'
  q: string;       // current search text
  perPage: number; // keep current page size
};

export default function FilterBar({ ptype, q, perPage }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const buildURL = useCallback(
    (next: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams?.toString() || '');
      params.set('page', '1');                 // reset page on filter change
      params.set('per', String(perPage));      // keep page size
      Object.entries(next).forEach(([k, v]) => {
        if (!v) params.delete(k);
        else params.set(k, v);
      });
      return `?${params.toString()}`;
    },
    [searchParams, perPage]
  );

  const onTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      router.push(buildURL({ ptype: e.target.value }));
    },
    [router, buildURL]
  );

  const actionURL = useMemo(() => buildURL({}), [buildURL]);

  return (
    <form
      action={actionURL}
      method="GET"
      className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border shadow-sm
                 bg-white text-gray-800 border-gray-200
                 dark:bg-white/10 dark:text-white dark:border-white/15 px-4 py-3"
    >
      {/* Type (auto-filter) */}
      <div className="relative">
        <select
          name="ptype"
          defaultValue={ptype || 'all'}
          onChange={onTypeChange}
          className="w-44 appearance-none rounded-lg bg-white text-gray-900 border border-gray-300
                     px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                     dark:bg-white/20 dark:text-white dark:border-white/25 dark:focus:ring-indigo-400"
        >
          <option value="all">All Types</option>
          <option value="dog">Dog</option>
          <option value="cat">Cat</option>
          <option value="other">Other</option>
        </select>
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs opacity-60 dark:opacity-80">
          ▾
        </span>
      </div>

      {/* Search input */}
      <input
        name="q"
        defaultValue={q}
        placeholder="Search name/breed…"
        className="w-72 rounded-lg bg-white text-gray-900 placeholder:text-gray-400
                   border border-gray-300 px-3 py-2 text-sm outline-none
                   focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                   dark:bg-white/20 dark:text-white dark:placeholder:text-white/70 dark:border-white/25 dark:focus:ring-indigo-400"
      />

      {/* keep page size on submit */}
      <input type="hidden" name="per" value={String(perPage)} />

      <button
        type="submit"
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white
                   hover:bg-indigo-700 active:scale-[.98] transition
                   dark:bg-indigo-500 dark:hover:bg-indigo-600"
      >
        Search
      </button>
    </form>
  );
}
