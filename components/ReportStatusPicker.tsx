"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Circle } from "lucide-react";

/**
 * A compact pill-style status picker with a dropdown menu.
 * Submits via the provided server action (updateStatus).
 */
export default function ReportStatusPicker({
  reportId,
  initialStatus,
  updateStatus,
}: {
  reportId: string;
  initialStatus: "open" | "closed" | "dismissed";
  updateStatus: (formData: FormData) => Promise<void>; // server action
}) {
  const [current, setCurrent] = useState<"open" | "closed" | "dismissed">(
    initialStatus ?? "open"
  );
  const [open, setOpen] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  const statusInputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Close when clicking outside
    function onDocClick(e: MouseEvent) {
      if (
        !menuRef.current?.contains(e.target as Node) &&
        !buttonRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function submitStatus(next: "open" | "closed" | "dismissed") {
    if (statusInputRef.current && formRef.current) {
      statusInputRef.current.value = next;
      setCurrent(next);
      setOpen(false);
      formRef.current.requestSubmit();
    }
  }

  const styleMap: Record<
    "open" | "closed" | "dismissed",
    { pill: string; dot: string }
  > = {
    open: {
      pill: "bg-amber-50 text-amber-700 ring-amber-200 hover:bg-amber-100",
      dot: "text-amber-500",
    },
    closed: {
      pill:
        "bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100",
      dot: "text-emerald-500",
    },
    dismissed: {
      pill: "bg-gray-100 text-gray-700 ring-gray-200 hover:bg-gray-200/60",
      dot: "text-gray-500",
    },
  };

  const currentStyles = styleMap[current];

  return (
    <div className="relative shrink-0">
      {/* form wires the server action */}
      <form ref={formRef} action={updateStatus} className="hidden">
        <input type="hidden" name="report_id" value={reportId} />
        <input ref={statusInputRef} type="hidden" name="status" value={current} />
      </form>

      {/* pill button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition ${currentStyles.pill}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={`report-status-menu-${reportId}`}
      >
        <Circle className={`h-3 w-3 ${currentStyles.dot}`} />
        <span className="capitalize">{current}</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-80" />
      </button>

      {/* dropdown */}
      {open && (
        <div
          ref={menuRef}
          id={`report-status-menu-${reportId}`}
          role="menu"
          className="absolute right-0 z-20 mt-2 w-40 overflow-hidden rounded-xl border border-black/5 bg-white shadow-lg ring-1 ring-black/5"
        >
          <MenuItem
            label="Open"
            active={current === "open"}
            colorClass="text-amber-600"
            onSelect={() => submitStatus("open")}
          />
          <MenuItem
            label="Closed"
            active={current === "closed"}
            colorClass="text-emerald-600"
            onSelect={() => submitStatus("closed")}
          />
          <MenuItem
            label="Dismissed"
            active={current === "dismissed"}
            colorClass="text-gray-600"
            onSelect={() => submitStatus("dismissed")}
          />
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── helpers ───────────────────────── */

function MenuItem({
  label,
  active,
  colorClass,
  onSelect,
}: {
  label: string;
  active: boolean;
  colorClass: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onSelect}
      className={`flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 focus:bg-gray-50 focus:outline-none ${
        active ? "font-medium" : ""
      }`}
    >
      <span className={`capitalize ${colorClass}`}>{label}</span>
      {active && <Check className="h-4 w-4 text-gray-600" />}
    </button>
  );
}
