"use client";
import { ID_TYPES } from "@/lib/id-types";

type Props = { value: string; onChange: (v: string) => void; label?: string };
export default function IdTypeSelect({ value, onChange, label = "ID type" }: Props) {
  return (
    <div>
      <label className="text-sm text-gray-600">{label}</label>
      <select
        className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 outline-none focus:ring-2 ring-indigo-500"
        value={ID_TYPES.includes(value as any) ? value : ""}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="" disabled>Select ID type…</option>
        {ID_TYPES.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
    </div>
  );
}
