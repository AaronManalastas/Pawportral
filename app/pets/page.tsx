// app/pets/layout.tsx
export const dynamicParams = true;          // allow any /pets/[id]
export const dynamic = "force-dynamic";     // don't prebuild, render on demand

export default function PetsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
