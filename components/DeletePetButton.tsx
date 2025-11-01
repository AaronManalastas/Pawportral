"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useFormStatus } from "react-dom";

type Props = {
  action: (formData: FormData) => void | Promise<void>; // your server action
  petId: string;
  returnTo: string;
};

function ModalPortal({ children }: { children: React.ReactNode }) {
  // Wait until mounted to avoid document access on the server
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? "Deleting..." : "Delete"}
    </button>
  );
}

export default function DeletePetButton({ action, petId, returnTo }: Props) {
  const [open, setOpen] = useState(false);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Prevent body scroll while modal is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-rose-300 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100"
      >
        Delete
      </button>

      {/* Modal */}
      {open && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            // clicking the dark backdrop closes the modal
            onClick={() => setOpen(false)}
            aria-modal="true"
            role="dialog"
          >
            <div
              className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg"
              // stop propagation so clicks inside the card don't close it
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-semibold text-gray-800">
                Confirm Deletion
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Are you sure you want to delete this pet? This action cannot be
                undone.
              </p>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>

                {/* Ensure POST for server action */}
                <form action={action} method="post">
                  <input type="hidden" name="pet_id" value={petId} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <SubmitButton />
                </form>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </>
  );
}
