// components/ProofImageZoom.tsx
"use client";

import { useEffect, useState } from "react";

export default function ProofImageZoom({
  src,
  alt,
  thumbClass,
}: {
  src: string;
  alt?: string;
  thumbClass?: string;
}) {
  const [open, setOpen] = useState(false);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!src) {
    return (
      <div
        className={
          thumbClass ||
          "h-12 w-12 rounded-md bg-gray-100 ring-1 ring-gray-200"
        }
      />
    );
  }

  return (
    <>
      {/* Thumbnail */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt || "proof"}
        className={
          thumbClass ||
          "h-12 w-12 rounded-md object-cover ring-1 ring-gray-200 cursor-zoom-in"
        }
        onClick={() => setOpen(true)}
        title="Click to zoom"
        draggable={false}
      />

      {/* Modal (fits entirely within viewport) */}
      {open && (
        <div
          className="fixed inset-0 z-[200] grid place-items-center bg-black/60 p-3 md:p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[88vh] max-w-[94vw] md:max-h-[85vh] md:max-w-[86vw] rounded-2xl bg-white p-2 md:p-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100"
                aria-label="Close"
              >
                Close
              </button>
            </div>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt || "proof (zoomed)"}
              className="
                block mx-auto
                h-auto w-auto
                max-h-[80vh] max-w-[88vw]
                md:max-h-[78vh] md:max-w-[82vw]
                rounded-lg object-contain
              "
              draggable={false}
            />
          </div>
        </div>
      )}
    </>
  );
}
