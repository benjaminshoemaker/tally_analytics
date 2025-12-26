import React from "react";

export default function DashboardHeader() {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
      <div className="flex flex-col">
        <span className="text-sm font-semibold text-slate-900">Fast PR Analytics</span>
        <span className="text-xs text-slate-600">Dashboard</span>
      </div>

      <form action="/api/auth/logout" method="post">
        <button type="submit" className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900">
          Log out
        </button>
      </form>
    </header>
  );
}
