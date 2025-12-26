import React from "react";

export default function DashboardSidebar() {
  return (
    <nav className="flex items-center gap-4 px-4 py-4 sm:px-6 md:flex-col md:items-stretch md:gap-2 md:py-6">
      <a href="/projects" className="text-sm font-medium text-slate-900 hover:text-slate-700">
        Projects
      </a>
      <a href="/settings" className="text-sm font-medium text-slate-900 hover:text-slate-700">
        Settings
      </a>
    </nav>
  );
}
