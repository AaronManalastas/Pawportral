export default function Footer() {
  return (
    <footer className="w-full bg-gradient-to-r from-violet-600 via-fuchsia-600 to-purple-600 text-white">
      {/* keep content constrained but background is full width */}
      <div className="mx-auto max-w-7xl px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-sm/6 text-white/90">
          © {new Date().getFullYear()} PawPortal. All rights reserved.
        </p>

        <nav className="flex items-center gap-6 text-sm/6">
          <a className="hover:underline underline-offset-4" href="/privacy">Privacy</a>
          <a className="hover:underline underline-offset-4" href="/terms">Terms</a>
          <a className="hover:underline underline-offset-4" href="/contact">Contact</a>
        </nav>
      </div>
    </footer>
  );
}
