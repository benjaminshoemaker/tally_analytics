'use client';

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

import { trackPageView } from "../core";

function AnalyticsAppRouterInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  useEffect(() => {
    const path = search ? `${pathname}?${search}` : pathname;
    void trackPageView(path);
  }, [pathname, search]);

  return null;
}

export function AnalyticsAppRouter() {
  return (
    <Suspense fallback={null}>
      <AnalyticsAppRouterInner />
    </Suspense>
  );
}

