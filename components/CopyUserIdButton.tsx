"use client";

import { Copy } from "lucide-react";

export default function CopyUserIdButton({ value }: { value: string }) {
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
        } catch {}
      }}
      className="inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm hover:bg-gray-50"
      title="Copy User ID"
    >
      <Copy className="h-4 w-4" />
      Copy User ID
    </button>
  );
}
