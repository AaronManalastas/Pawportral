// app/admin/layout.tsx
import AdminNav from "@/components/admin/AdminNav";
import { requireAdmin } from "@/lib/adminAuth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireAdmin(); // redirects internally on normal failures
  } catch {
    // If anything unexpected happens, fail closed instead of blank screen
    redirect("/sign-in");
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <AdminNav />
      </div>
      {children}
    </div>
  );
}
