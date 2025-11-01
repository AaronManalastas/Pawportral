"use client";

import { useEffect, useRef, useState } from "react";

export default function AddFivePhotos({
  name = "photos",
  submitButtonId = "save-pet-btn",
}: {
  name?: string;
  submitButtonId?: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string>("");

  // Disable submit until exactly 5
  useEffect(() => {
    const btn = document.getElementById(submitButtonId) as HTMLButtonElement | null;
    if (btn) btn.disabled = files.length !== 5;
  }, [files, submitButtonId]);

  // Keep real input in sync (most browsers)
  function syncInput(list: File[]) {
    const input = inputRef.current;
    if (!input) return;
    const dt = new DataTransfer();
    list.forEach((f) => dt.items.add(f));
    input.files = dt.files;
  }

  function setFilesAndValidate(list: File[]) {
    const onlyImages = list.filter((f) => f.type.startsWith("image/"));
    const capped = onlyImages.slice(0, 5);
    setFiles(capped);
    syncInput(capped);
    setError(
      capped.length === 5
        ? ""
        : `Please pick exactly 5 images (currently ${capped.length}).`
    );
  }

  function openPicker() {
    inputRef.current?.click();
  }

  function onChoose(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image/"));
    if (selected.length === 0) return;
    const room = 5 - files.length;
    const toAdd = selected.slice(0, room);
    setFilesAndValidate([...files, ...toAdd]);
    if (inputRef.current) inputRef.current.value = ""; // allow re-adding same files
  }

  function removeAt(idx: number) {
    const next = files.filter((_, i) => i !== idx);
    setFilesAndValidate(next);
  }

  // Force all files into FormData at submit time (works everywhere)
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    const form = input.closest("form");
    if (!form) return;

    const onFormData = (e: any) => {
      try {
        e.formData.delete(name);
        files.forEach((f) => e.formData.append(name, f));
      } catch {}
    };

    form.addEventListener("formdata", onFormData);
    return () => form.removeEventListener("formdata", onFormData);
  }, [files, name]);

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept="image/*"
        multiple
        className="hidden"
        onChange={onChoose}
      />

      <button
        type="button"
        onClick={openPicker}
        className="rounded-xl bg-indigo-600 px-4 py-2 text-white shadow-sm hover:bg-indigo-700"
      >
        Choose photos
      </button>

      <div className="text-xs text-gray-600">
        JPEG/PNG • up to ~5MB each • <strong>exactly 5</strong> required.
      </div>
      <div className={`text-xs ${files.length === 5 ? "text-emerald-700" : "text-rose-600"}`}>
        {files.length}/5 selected
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {files.map((f, i) => {
          const url = URL.createObjectURL(f);
          return (
            <div key={i} className="relative overflow-hidden rounded-xl border bg-white/70">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`photo-${i + 1}`}
                className="h-32 w-full object-cover"
                onLoad={() => URL.revokeObjectURL(url)}
              />
              <div className="absolute bottom-1 left-1 rounded bg-black/50 px-1.5 py-0.5 text-[11px] text-white">
                {i + 1}/5
              </div>
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-1 text-xs text-white hover:bg-black/80"
                aria-label="Remove"
              >
                Remove
              </button>
            </div>
          );
        })}

        {files.length < 5 && (
          <button
            type="button"
            onClick={openPicker}
            className="flex h-32 w-full items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-white/60 text-3xl leading-none hover:bg-white"
            aria-label="Add more photos"
            title="Add more photos"
          >
            +
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}
    </div>
  );
}
