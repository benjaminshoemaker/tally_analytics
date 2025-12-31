import React from "react";

import DashboardHeader from "../../components/dashboard/header";
import DashboardSidebar from "../../components/dashboard/sidebar";
import MobileTabBar from "../../components/dashboard/mobile-tab-bar";
import Providers from "../../lib/providers";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-warm-50">
      <div className="mx-auto flex w-full max-w-6xl flex-col md:flex-row">
        {/* Desktop sidebar - hidden on mobile */}
        <aside className="hidden border-r border-warm-200 bg-white md:block md:w-64 md:flex-shrink-0">
          <DashboardSidebar />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <DashboardHeader />
          <Providers>
            {/* Add bottom padding on mobile for the tab bar */}
            <main className="flex-1 px-4 py-8 pb-24 sm:px-6 md:pb-8">{children}</main>
          </Providers>
        </div>
      </div>

      {/* Mobile bottom tab bar */}
      <MobileTabBar />
    </div>
  );
}
