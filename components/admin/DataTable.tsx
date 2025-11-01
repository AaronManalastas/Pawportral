"use client";

import * as React from "react";

type Column<T> = {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
};

export function DataTable<T extends { id: string | number }>({
  columns,
  rows,
  selectable = false,
  selected = [],
  onToggle,
}: {
  columns: Column<T>[];
  rows: T[];
  selectable?: boolean;
  selected?: (string | number)[];
  onToggle?: (id: string | number, next: boolean) => void;
}) {
  return (
    <div className="overflow-auto rounded-2xl border border-gray-100 dark:border-white/10">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-white/10">
        <thead className="bg-gray-50 dark:bg-white/5">
          <tr>
            {selectable && <th className="px-4 py-3 text-left text-xs font-medium">Select</th>}
            {columns.map((c) => (
              <th key={String(c.key)} className="px-4 py-3 text-left text-xs font-medium">
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-transparent divide-y divide-gray-100 dark:divide-white/10">
          {rows.map((r) => (
            <tr key={String(r.id)} className="hover:bg-gray-50/60 dark:hover:bg-white/10">
              {selectable && (
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.includes(r.id)}
                    onChange={(e) => onToggle?.(r.id, e.target.checked)}
                  />
                </td>
              )}
              {columns.map((c) => (
                <td key={String(c.key)} className="px-4 py-3 text-sm">
                  {c.render ? c.render(r) : String((r as any)[c.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
