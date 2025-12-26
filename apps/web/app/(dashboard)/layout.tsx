import React from "react";

import DashboardHeader from "../../components/dashboard/header";
import DashboardSidebar from "../../components/dashboard/sidebar";
import Providers from "../../lib/providers";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50">
      <div className="mx-auto flex w-full max-w-6xl flex-col md:flex-row">
        <aside className="border-b border-slate-200 bg-white md:w-64 md:flex-shrink-0 md:border-b-0 md:border-r">
          <DashboardSidebar />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <DashboardHeader />
          <Providers>
            <main className="flex-1 px-4 py-8 sm:px-6">{children}</main>
          </Providers>
        </div>
      </div>
    </div>
  );
}
