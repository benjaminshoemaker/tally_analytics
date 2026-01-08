import React from "react";

import UserDropdown from "./user-dropdown";

export type DashboardHeaderUser = {
  username: string;
  avatarUrl: string | null;
};

export default function DashboardHeader({ user }: { user?: DashboardHeaderUser }) {
  return (
    <header className="flex items-center justify-between border-b border-warm-200 bg-white px-4 py-3 sm:px-6">
      <div className="flex items-center gap-3">
        {/* Mobile logo */}
        <a href="/" className="flex items-center gap-2 md:hidden">
          <div className="flex size-7 items-center justify-center rounded-lg bg-brand-500/10 text-brand-500">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
              <path
                fill="currentColor"
                d="M3 3h18v18H3V3zm4 14h2V9H7v8zm4 0h2V5h-2v12zm4 0h2v-6h-2v6z"
              />
            </svg>
          </div>
          <span className="text-base font-bold tracking-tight text-warm-900">Tally</span>
        </a>
      </div>

      {user ? (
        <UserDropdown username={user.username} avatarUrl={user.avatarUrl} />
      ) : (
        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            className="group flex items-center gap-2 rounded-lg border border-warm-200 bg-white px-3 py-1.5 text-sm font-medium text-warm-700 shadow-sm transition-all hover:border-warm-300 hover:bg-warm-50 hover:text-warm-900"
          >
            <svg className="size-4 text-warm-400 transition-colors group-hover:text-warm-600" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3M11 11l3-3-3-3M14 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Log out
          </button>
        </form>
      )}
    </header>
  );
}
