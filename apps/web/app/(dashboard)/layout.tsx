import React from "react";

import DashboardHeader from "../../components/dashboard/header";
import DashboardSidebar from "../../components/dashboard/sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex w-full max-w-6xl flex-col md:flex-row">
        <aside className="border-b border-slate-200 bg-white md:w-64 md:flex-shrink-0 md:border-b-0 md:border-r">
          <DashboardSidebar />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <DashboardHeader />
          <main className="flex-1 px-6 py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}

