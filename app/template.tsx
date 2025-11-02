// app/template.tsx
"use client";

import { Suspense } from "react";

export default function RootTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      {children}
    </Suspense>
  );
}
