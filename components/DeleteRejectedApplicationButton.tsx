// app/components/DeleteRejectedApplicationButton.tsx
"use client";

import { useState } from "react";
import { X } from "lucide-react";

export default function DeleteRejectedApplicationButton({
  applicationId,
}: {
  applicationId: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* X Button */}
      <button
        onClick={() => setOpen(true)}
        title="Remove rejected application"
        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-rose-600 hover:bg-rose-50 hover:text-rose-700"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Overlay Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold">Remove this application?</h2>
            <p className="mt-2 text-sm text-gray-600">
              This will permanently delete your rejected application from your dashboard.
            </p>

            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                Cancel
              </button>

              <form action="/dashboard/deleteMyApplication" method="post">
                <input type="hidden" name="application_id" value={applicationId} />
                <button
                  type="submit"
                  className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm text-white shadow-sm hover:bg-rose-700"
                >
                  Delete
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
