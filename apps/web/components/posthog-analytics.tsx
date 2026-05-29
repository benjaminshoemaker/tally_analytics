'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';

import { capturePostHogPageview } from '../lib/posthog/client';

function PostHogPageview() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  useEffect(() => {
    if (!pathname) return;

    const currentUrl = `${window.location.origin}${pathname}${search ? `?${search}` : ''}`;
    capturePostHogPageview(currentUrl);
  }, [pathname, search]);

  return null;
}

export function PostHogAnalytics() {
  return (
    <Suspense fallback={null}>
      <PostHogPageview />
    </Suspense>
  );
}
