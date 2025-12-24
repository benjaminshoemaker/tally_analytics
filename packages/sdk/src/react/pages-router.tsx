'use client';

import { useRouter } from "next/router";
import { useEffect } from "react";

import { trackPageView } from "../core";

export function useAnalyticsPagesRouter() {
  const router = useRouter();

  useEffect(() => {
    void trackPageView(router.asPath);

    const handleRouteChange = (url: string) => {
      void trackPageView(url);
    };

    router.events.on("routeChangeComplete", handleRouteChange);
    return () => {
      router.events.off("routeChangeComplete", handleRouteChange);
    };
  }, [router]);
}

