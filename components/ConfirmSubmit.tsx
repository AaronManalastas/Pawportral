// components/ConfirmSubmit.tsx
"use client";

import { useRef, useState, useTransition } from "react";

export default function ConfirmSubmit({
  text,
  confirm = "Are you sure?",
  className,
}: {
  text: string;
  confirm?: string;
  className?: string;
}) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [pending, startTransition] = useTransition();
  const [clicked, setClicked] = useState(false);

  // find the nearest form element and submit it
  function submitForm() {
    const form = formRef.current ?? (document && (findForm(event?.target as HTMLElement)));
    form?.requestSubmit?.();
  }

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    if (pending || clicked) return;

    const ok = window.confirm(confirm);
    if (!ok) return;

    setClicked(true);
    startTransition(() => submitForm());
  }

  return (
    <button
      ref={(el) => {
        // find the wrapping form
        // @ts-ignore
        formRef.current = el?.closest("form") ?? null;
      }}
      onClick={handleClick}
      disabled={pending || clicked}
      className={className}
      aria-busy={pending || clicked}
      type="button"
    >
      {pending || clicked ? "Deleting…" : text}
    </button>
  );
}

function findForm(el?: HTMLElement | null): HTMLFormElement | null {
  let cur: HTMLElement | null | undefined = el ?? null;
  while (cur) {
    if (cur.tagName === "FORM") return cur as HTMLFormElement;
    cur = cur.parentElement;
  }
  return null;
}
