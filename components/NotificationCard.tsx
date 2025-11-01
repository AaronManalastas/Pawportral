// app/components/NotificationCard.tsx
"use client";

import { ReactNode, KeyboardEvent } from "react";
import { X } from "lucide-react";

export default function NotificationCard({
  title,
  body,
  datetime,        // already formatted
  unread,
  icon,
  tone = "gray",   // "indigo" | "green" | "rose" | "gray"
  imgSrc,
  onCardClick,     // navigate on click
  onDismiss,       // delete notif
}: {
  title: string;
  body?: string;
  datetime: string;
  unread?: boolean;
  icon: ReactNode;
  tone?: "indigo" | "green" | "rose" | "gray";
  imgSrc?: string | null;
  onCardClick: () => void;
  onDismiss: () => void;
}) {
  const toneBg =
    tone === "rose"
      ? "bg-rose-100 text-rose-600"
      : tone === "green"
      ? "bg-green-100 text-green-600"
      : tone === "indigo"
      ? "bg-indigo-100 text-indigo-600"
      : "bg-gray-100 text-gray-600";

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onCardClick();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onCardClick}
      onKeyDown={onKey}
      className={`group relative flex cursor-pointer items-start gap-3 rounded-2xl border p-3 shadow-sm transition ${
        unread ? "bg-rose-50/40" : "bg-white"
      } hover:shadow-md hover:ring-1 hover:ring-black/5`}
    >
      {/* status icon */}
      <div className={`mt-0.5 rounded-full p-2 ${toneBg}`}>{icon}</div>

      {/* avatar */}
      <div className="mt-0.5 h-10 w-10 overflow-hidden rounded-lg border bg-white shadow-inner">
        {imgSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgSrc}
            alt=""
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
            🐾
          </div>
        )}
      </div>

      {/* content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className={`truncate text-sm font-semibold ${unread ? "text-gray-900" : "text-gray-800"}`}>
            {title}
          </p>
        </div>

        {body && (
          <p className="mt-1 text-xs text-gray-500">
            {body}
            {datetime ? <span className="text-gray-400"> • {datetime}</span> : null}
          </p>
        )}
      </div>

      {/* dismiss */}
      <button
        className="absolute right-2 top-2 rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
        aria-label="Dismiss"
        title="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
