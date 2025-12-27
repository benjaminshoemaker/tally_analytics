import React from "react";

const INSTALL_URL = "https://github.com/apps/tally-analytics-agent";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <a href="/" className="text-sm font-semibold text-slate-900">
            Tally Analytics
          </a>

          <nav className="flex items-center gap-4 text-sm text-slate-600">
            <a href="/pricing" className="hover:text-slate-900">
              Pricing
            </a>
            <a href="/docs" className="hover:text-slate-900">
              Docs
            </a>
            <a href="/login" className="hover:text-slate-900">
              Sign in
            </a>
            <a
              href={INSTALL_URL}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Add to GitHub
            </a>
          </nav>
        </div>
      </header>

      {children}

      <footer className="border-t border-slate-200 bg-white py-10">
        <div className="mx-auto max-w-5xl px-6 text-sm text-slate-600">
          <p>
            © {new Date().getFullYear()} Tally Analytics. Built for Next.js.
          </p>
        </div>
      </footer>
    </div>
  );
}

