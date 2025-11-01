"use client";

import { useState } from "react";

export default function MarkAdoptedButton({
  petId,
  className,
}: {
  petId: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function mark() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/pets/mark-adopted", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ petId }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        // Surface constraint issues nicely
        if (j?.code === "PETS_STATUS_CHECK") {
          setError(
            "Update failed: your `pets.status` column currently forbids the value 'adopted'. " +
              "See the SQL fix below to allow it."
          );
        } else {
          setError(j?.error || "Network error while marking adopted.");
        }
        setSaving(false);
        return;
      }

      // Success → refresh dashboard (pet disappears from public Adopt page,
      // badge turns to 'adopted', and admin counts pick it up).
      window.location.assign("/dashboard?success=Pet marked as adopted.");
    } catch (e: any) {
      setError(String(e?.message || e));
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 ${className || ""}`}
      >
        Already adopted
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
            {/* Top bar */}
            <div className="bg-gradient-to-r from-fuchsia-500 to-indigo-600 p-4 text-white">
              <div className="text-base font-semibold">Mark this pet as ADOPTED?</div>
              <div className="mt-1 text-xs opacity-90">
                This will remove it from the public Adopt page.
              </div>
            </div>

            {/* Body */}
            <div className="space-y-3 p-4">
              {error && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={saving}
                  className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={mark}
                  disabled={saving}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
