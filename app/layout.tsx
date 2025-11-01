// app/layout.tsx
import "../styles/globals.css";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BackgroundFX from "@/components/BackgroundFX";
import { ThemeProvider } from "next-themes";
import SuspensionGate from "@/components/SuspensionGate"; // ← ADD

export const metadata: Metadata = {
  title: "PawPortal — Ethical Pet Adoption Bridge",
  description:
    "A bridging platform connecting pet owners, shelters, and adopters in a safe, ethical way.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* base light, improved dark; smooth color transitions */}
      <body className="relative min-h-screen bg-white text-gray-900 antialiased transition-colors dark:bg-[#0b1020] dark:text-gray-100">
        {/* ThemeProvider enables next-themes across the app.
           - attribute="class" lets Tailwind use the .dark class
           - enableSystem={false} removes 'system' behavior (per your request)
           - defaultTheme="light" keeps current feel unless user switches */}
        <ThemeProvider attribute="class" enableSystem={false} defaultTheme="light">
          {/* 🔒 Blocks suspended users anywhere in the app */}
          <SuspensionGate /> {/* ← ADD */}

          {/* Global animated background (works in both themes) */}
          <BackgroundFX className="fixed inset-0" global variant="soft" />

          {/* All UI above the background */}
          <div className="relative z-10 flex min-h-screen flex-col">
            {/* ✅ Make the navbar follow ONLY in dark mode */}
            <div className="dark:fixed dark:top-0 dark:left-0 dark:right-0 dark:z-50">
              <Navbar />
            </div>
            {/* Offset so content doesn't hide under the fixed bar (dark mode only) */}
            <div className="hidden dark:block h-[64px]" />

            {/* Page content */}
            <main className="w-full flex-1 py-12 px-3 sm:px-4 lg:px-6">
              {children}
            </main>

            <Footer />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
