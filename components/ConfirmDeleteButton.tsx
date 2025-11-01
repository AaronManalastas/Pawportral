// components/ConfirmDeleteButton.tsx
"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function ConfirmDeleteButton({
  reportId,
  action,
}: {
  reportId: string;
  action: (formData: FormData) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    cancelRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function onConfirm() {
    setErr(null);
    const fd = new FormData();
    fd.append("report_id", reportId);

    startTransition(async () => {
      try {
        await action(fd);   // server delete + revalidate
        setOpen(false);
        router.refresh();   // 🔄 make the card disappear immediately
      } catch (e: any) {
        setErr(e?.message || "Failed to delete. Please try again.");
      }
    });
  }

  return (
    <>
      {/* X button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={isPending}
        title="Delete report"
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-rose-200/70 text-rose-600 hover:bg-rose-50 disabled:opacity-50 active:scale-95 transition"
        aria-label="Delete"
      >
        {isPending ? "…" : "×"}
      </button>

      {open && (
        <div className="fixed inset-0 z-[1000]">
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !isPending && setOpen(false)}
          />
          {/* perfectly centered card */}
          <div className="pointer-events-none absolute inset-0">
            <div className="pointer-events-auto absolute left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-white/10 bg-white/95 shadow-2xl dark:bg-[#0c111b]">
              <div className="px-5 py-3 bg-gradient-to-r from-rose-600 via-fuchsia-600 to-purple-600 text-white">
                <div className="text-base font-semibold">Delete report?</div>
              </div>

              <div className="p-5 space-y-4">
                <p className="text-sm text-gray-700 dark:text-gray-100">
                  This action is <span className="font-semibold text-rose-600">permanent</span> and cannot be undone.
                </p>

                {err && (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {err}
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    ref={cancelRef}
                    type="button"
                    onClick={() => setOpen(false)}
                    disabled={isPending}
                    className="rounded-xl border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 dark:border-white/15 dark:hover:bg-white/10 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={onConfirm}
                    disabled={isPending}
                    className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-rose-500 disabled:opacity-50"
                  >
                    {isPending ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
