// app/admin/pets/ActionsBar.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Pet = {
  id: string;
  name?: string | null;
  breed?: string | null;

  type?: string | null;
  pet_type?: string | null;
  species?: string | null;
  category?: string | null;

  age_months?: number | null;
  ageMonths?: string | number | null;
  age_in_months?: number | null;
  age?: number | null;

  status?: string | null;

  // 🔹 possible column names we’ll read safely
  sex?: string | null;
  gender?: string | null;
  location?: string | null;
  city?: string | null;
  description?: string | null;
  about?: string | null;
};

type EditForm = {
  name: string;
  breed: string;
  type: string;
  age_months: string;
  status: "Pending" | "Approved" | "Rejected";

  // 🔹 newly editable fields
  sex: "Male" | "Female" | "Unknown";
  location: string;
  about: string;
};

const uiToDbStatus = (ui: string) => {
  const v = (ui || "").toLowerCase().trim();
  if (v === "approved") return "approved";
  if (v === "rejected") return "rejected";
  return "pending";
};

const dbToUiStatus = (db?: string | null): EditForm["status"] => {
  const v = (db || "").toLowerCase();
  if (v === "approved") return "Approved";
  if (v === "rejected") return "Rejected";
  return "Pending";
};

// Which checkboxes are selected in the grid
function getSelectedIds() {
  const nodes = document.querySelectorAll<HTMLInputElement>(
    'input[name="selected"]:checked'
  );
  return Array.from(nodes).map((n) => n.value);
}

export default function ActionsBar() {
  const router = useRouter();

  // selection
  const [selected, setSelected] = useState<string[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // edit state
  const [petId, setPetId] = useState<string | null>(null);
  const [form, setForm] = useState<EditForm>({
    name: "",
    breed: "",
    type: "",
    age_months: "",
    status: "Pending",
    // 🔹 defaults for new fields
    sex: "Unknown",
    location: "",
    about: "",
  });

  // track checkbox selection in the table
  useEffect(() => {
    const onChange = () => setSelected(getSelectedIds());
    document.addEventListener("change", onChange);
    onChange(); // initial
    return () => document.removeEventListener("change", onChange);
  }, []);

  const canEdit = selected.length === 1;
  const canRemove = selected.length > 0;

  // open edit — load row for the single selected id
  const openEdit = async () => {
    if (!canEdit) return;
    const id = selected[0];
    setLoading(true);
    try {
      const res = await fetch(`/api/pets?id=${encodeURIComponent(id)}`);
      if (!res.ok) {
        const t = await res.text();
        alert(`Failed to load pet: ${t}`);
        return;
      }
      const j = (await res.json()) as { pet: Pet };
      const p = j.pet;

      const type = p.type ?? p.pet_type ?? p.species ?? p.category ?? "";
      const age =
        (p.age_months as number | null) ??
        (p.ageMonths as number | null) ??
        p.age_in_months ??
        p.age ??
        null;

      // 🔹 map optional columns safely
      const sexRaw = (p.sex ?? p.gender ?? "Unknown") as string;
      const sex =
        /male/i.test(sexRaw) ? "Male" :
        /female/i.test(sexRaw) ? "Female" : "Unknown";

      const location = p.location ?? p.city ?? "";
      const about = p.description ?? p.about ?? "";

      setPetId(id);
      setForm({
        name: p.name ?? "",
        breed: p.breed ?? "",
        type: type ?? "",
        age_months: age === null || age === undefined ? "" : String(age),
        status: dbToUiStatus(p.status),
        sex,
        location,
        about,
      });
      setEditOpen(true);
    } catch (e: any) {
      console.error(e);
      alert("Failed to load pet.");
    } finally {
      setLoading(false);
    }
  };

  const onEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!petId) return;
    setLoading(true);
    try {
      // 🔹 build updates payload conservatively
      const values: any = {
        name: form.name.trim(),
        breed: form.breed.trim(),
        type: form.type.trim(),
        status: uiToDbStatus(form.status),
      };

      const ageClean = form.age_months.trim();
      if (ageClean !== "") values.age_months = Number(ageClean);

      // 🔹 new fields → map to common column names
      if (form.sex) values.sex = form.sex;              // expects 'Male' | 'Female' | 'Unknown'
      if (form.location.trim()) values.location = form.location.trim();
      values.description = form.about.trim();           // empty string ok (clears)

      const payload = { id: petId, values };

      const res = await fetch("/api/pets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let msg = "Update failed.";
        try {
          const j = await res.json();
          if (j?.error) msg = j.error;
        } catch {
          /* ignore */
        }
        console.error("PATCH /api/pets failed:", msg);
        alert(`Update failed: ${msg}`);
        return;
      }

      setEditOpen(false);
      setPetId(null);
      router.refresh();
    } catch (e: any) {
      console.error(e);
      alert("Update failed. See console for details.");
    } finally {
      setLoading(false);
    }
  };

  /** REMOVE PET(S)
   * Calls /api/pets/remove (server route should delete + notify owners)
   */
  const removeSelected = async () => {
    if (!canRemove) return;

    const count = selected.length;
    if (
      !confirm(
        `Remove ${count} pet${count > 1 ? "s" : ""}? This cannot be undone.`
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/pets/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selected }),
      });

      const payload = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        throw new Error(payload?.error || "Remove failed.");
      }

      document
        .querySelectorAll<HTMLInputElement>('input[name="selected"]:checked')
        .forEach((n) => (n.checked = false));

      setSelected([]);
      router.refresh();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Delete failed. See console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={openEdit}
          disabled={!canEdit || loading}
          className={`px-4 py-2 rounded-md border ${
            canEdit ? "hover:bg-white/5" : "opacity-50 cursor-not-allowed"
          }`}
        >
          Edit Information
        </button>

        <button
          type="button"
          onClick={removeSelected}
          disabled={!canRemove || loading}
          className={`px-4 py-2 rounded-md border border-red-400/40 text-red-300 ${
            canRemove && !loading ? "hover:bg-red-400/5" : "opacity-50 cursor-not-allowed"
          }`}
        >
          Remove Pet
        </button>
      </div>

      {/* Edit dialog */}
      {editOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-pet-title"
        >
          <div
            className="
              w-full max-w-xl rounded-lg p-5
              bg-white text-gray-900 border border-gray-200
              dark:bg-neutral-900 dark:text-gray-100 dark:border-white/10
            "
          >
            <h3 id="edit-pet-title" className="text-lg font-semibold mb-4">
              Edit Pet
            </h3>

            <form onSubmit={onEditSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm mb-1 text-gray-900 dark:text-gray-100">
                  Name
                </label>
                <input
                  className="
                    w-full rounded-md px-3 py-2
                    bg-white text-gray-900 border border-gray-300 placeholder-gray-500
                    focus:outline-none focus:ring-2 focus:ring-indigo-400
                    dark:bg-neutral-800 dark:text-gray-100 dark:border-white/20 dark:placeholder-gray-400
                  "
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Pet name"
                />
              </div>

              {/* Type & Breed */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1 text-gray-900 dark:text-gray-100">
                    Type
                  </label>
                  <input
                    className="
                      w-full rounded-md px-3 py-2
                      bg-white text-gray-900 border border-gray-300 placeholder-gray-500
                      focus:outline-none focus:ring-2 focus:ring-indigo-400
                      dark:bg-neutral-800 dark:text-gray-100 dark:border-white/20 dark:placeholder-gray-400
                    "
                    value={form.type}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, type: e.target.value }))
                    }
                    placeholder="dog / cat / …"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1 text-gray-900 dark:text-gray-100">
                    Breed
                  </label>
                  <input
                    className="
                      w-full rounded-md px-3 py-2
                      bg-white text-gray-900 border border-gray-300 placeholder-gray-500
                      focus:outline-none focus:ring-2 focus:ring-indigo-400
                      dark:bg-neutral-800 dark:text-gray-100 dark:border-white/20 dark:placeholder-gray-400
                    "
                    value={form.breed}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, breed: e.target.value }))
                    }
                    placeholder="breed"
                  />
                </div>
              </div>

              {/* Age & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1 text-gray-900 dark:text-gray-100">
                    Age (months)
                  </label>
                  <input
                    className="
                      w-full rounded-md px-3 py-2
                      bg-white text-gray-900 border border-gray-300 placeholder-gray-500
                      focus:outline-none focus:ring-2 focus:ring-indigo-400
                      dark:bg-neutral-800 dark:text-gray-100 dark:border-white/20 dark:placeholder-gray-400
                    "
                    value={form.age_months}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, age_months: e.target.value }))
                    }
                    placeholder="e.g. 21"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1 text-gray-900 dark:text-gray-100">
                    Status
                  </label>
                  <select
                    className="
                      w-full rounded-md px-3 py-2
                      bg-white text-gray-900 border border-gray-300
                      focus:outline-none focus:ring-2 focus:ring-indigo-400
                      dark:bg-neutral-800 dark:text-gray-100 dark:border-white/20
                    "
                    value={form.status}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        status: e.target.value as EditForm["status"],
                      }))
                    }
                  >
                    <option>Pending</option>
                    <option>Approved</option>
                    <option>Rejected</option>
                  </select>
                </div>
              </div>

              {/* 🔹 NEW: Sex & Location */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1 text-gray-900 dark:text-gray-100">
                    Sex
                  </label>
                  <select
                    className="
                      w-full rounded-md px-3 py-2
                      bg-white text-gray-900 border border-gray-300
                      focus:outline-none focus:ring-2 focus:ring-indigo-400
                      dark:bg-neutral-800 dark:text-gray-100 dark:border-white/20
                    "
                    value={form.sex}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, sex: e.target.value as EditForm["sex"] }))
                    }
                  >
                    <option>Male</option>
                    <option>Female</option>
                    <option>Unknown</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1 text-gray-900 dark:text-gray-100">
                    Location
                  </label>
                  <input
                    className="
                      w-full rounded-md px-3 py-2
                      bg-white text-gray-900 border border-gray-300 placeholder-gray-500
                      focus:outline-none focus:ring-2 focus:ring-indigo-400
                      dark:bg-neutral-800 dark:text-gray-100 dark:border-white/20 dark:placeholder-gray-400
                    "
                    value={form.location}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, location: e.target.value }))
                    }
                    placeholder="e.g. Manila / Lipa"
                  />
                </div>
              </div>

              {/* 🔹 NEW: About */}
              <div>
                <label className="block text-sm mb-1 text-gray-900 dark:text-gray-100">
                  About
                </label>
                <textarea
                  rows={3}
                  className="
                    w-full rounded-md px-3 py-2
                    bg-white text-gray-900 border border-gray-300 placeholder-gray-500
                    focus:outline-none focus:ring-2 focus:ring-indigo-400
                    dark:bg-neutral-800 dark:text-gray-100 dark:border-white/20 dark:placeholder-gray-400
                  "
                  value={form.about}
                  onChange={(e) => setForm((f) => ({ ...f, about: e.target.value }))}
                  placeholder="Short description"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="
                    px-4 py-2 rounded-md border
                    bg-gray-100 text-gray-900 border-gray-300 hover:bg-gray-50
                    dark:bg-transparent dark:text-gray-100 dark:border-white/20 dark:hover:bg-white/5
                  "
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="
                    px-4 py-2 rounded-md
                    bg-indigo-600 text-white hover:bg-indigo-700
                    disabled:opacity-60 disabled:cursor-not-allowed
                  "
                >
                  {loading ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
