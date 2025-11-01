// components/AddPetCareDialog.tsx
"use client";

import * as React from "react";
import { X } from "lucide-react";

export default function AddPetCareDialog({
  submitButtonId,
}: {
  submitButtonId: string;
}) {
  const [open, setOpen] = React.useState(false);

  const [careTitle, setCareTitle] = React.useState(
    "Any conditions, allergies, etc."
  );
  const [feeding, setFeeding] = React.useState(
    "2x a day, fresh water always, no chocolate..."
  );
  const [exercise, setExercise] = React.useState(
    "15–30 mins walk AM, play ball, interactive toys..."
  );
  const [grooming, setGrooming] = React.useState(
    "Monthly deworm, weekly bath, brush coat, check ears..."
  );
  const [notes, setNotes] = React.useState(
    "Gentle, ok with kids, not ok with cats, afraid of thunder..."
  );
  const [env, setEnv] = React.useState("Indoor / Outdoor");
  const [adopter, setAdopter] = React.useState("Beginner friendly");

  const handleSubmit = () => {
    const form =
      document.querySelector("form[action][method='post']") ||
      document.querySelector("form");
    if (!form) {
      setOpen(false);
      return;
    }

    const setHidden = (name: string, value: string) => {
      let el = form.querySelector<HTMLInputElement>(
        `input[name="${name}"][type="hidden"]`
      );
      if (!el) {
        el = document.createElement("input");
        el.type = "hidden";
        el.name = name;
        form.appendChild(el);
      }
      el.value = value;
    };

    setHidden("care_title", careTitle);
    setHidden("care_feeding", feeding);
    setHidden("care_exercise", exercise);
    setHidden("care_grooming", grooming);
    setHidden("care_notes", notes);
    setHidden("care_env", env);
    setHidden("care_adopter", adopter);

    const realBtn = document.getElementById(
      submitButtonId
    ) as HTMLButtonElement | null;
    if (realBtn) realBtn.click();
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-600"
      >
        Save pet
      </button>

      {open ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold">
                  How to take care of this pet
                </h2>
                <p className="text-sm text-slate-500">
                  Add quick care instructions to help adopters.
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* 👉 changed label here */}
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700">
                  Medical Notes
                </label>
                <input
                  value={careTitle}
                  onChange={(e) => setCareTitle(e.target.value)}
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Feeding / diet
                </label>
                <textarea
                  value={feeding}
                  onChange={(e) => setFeeding(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Exercise / enrichment
                </label>
                <textarea
                  value={exercise}
                  onChange={(e) => setExercise(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Health / grooming
                </label>
                <textarea
                  value={grooming}
                  onChange={(e) => setGrooming(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Extra notes / temperament
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Living environment
                </label>
                <select
                  value={env}
                  onChange={(e) => setEnv(e.target.value)}
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option>Indoor</option>
                  <option>Outdoor</option>
                  <option>Indoor / Outdoor</option>
                  <option>With yard</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Recommended adopter
                </label>
                <select
                  value={adopter}
                  onChange={(e) => setAdopter(e.target.value)}
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option>Beginner friendly</option>
                  <option>Experienced only</option>
                  <option>With yard</option>
                  <option>With older kids</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setOpen(false)}
                className="rounded-xl border px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="rounded-xl bg-indigo-500 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-600"
              >
                Submit & continue
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
