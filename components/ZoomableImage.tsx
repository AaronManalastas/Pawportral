"use client";

import { useState } from "react";

export default function ZoomableImage({
  src,
  alt = "Image",
  className = "",
}: {
  src: string;
  alt?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  if (!src) return null;

  return (
    <>
      {/* thumbnail */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`block cursor-zoom-in ${className}`}
        title="Click to zoom"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="h-72 w-full object-contain bg-slate-100"
        />
      </button>

      {/* modal */}
      {open ? (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-2xl bg-slate-900/40"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              className="max-h-[90vh] max-w-[90vw] object-contain"
            />

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-2 top-2 rounded-full bg-black/70 px-3 py-1 text-sm text-white hover:bg-black"
            >
              ✕ Close
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
