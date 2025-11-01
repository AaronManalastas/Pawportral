// app/components/WithdrawAppButton.tsx
"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function WithdrawAppButton({
  action,
  appId,
}: {
  action: (formData: FormData) => void | Promise<void>;
  appId: string;
}) {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false); // avoid SSR mismatch for portal
  useEffect(() => setReady(true), []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
      >
        Withdraw
      </button>

      {open &&
        ready &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg"
            >
              <h2 className="text-lg font-semibold text-gray-900">
                Withdraw application?
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                This can’t be undone. You can apply again later if you change your mind.
              </p>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>

                <form action={action} onSubmit={() => setOpen(false)}>
                  <input type="hidden" name="application_id" value={appId} />
                  <button
                    type="submit"
                    className="rounded-md bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700"
                  >
                    Withdraw
                  </button>
                </form>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
