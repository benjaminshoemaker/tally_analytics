'use client';

import { AnalyticsAppRouter, init } from '@tally-analytics/sdk';

init({
  projectId: 'proj_76jzxBzq6mdXcXy',
  eventsUrl: process.env.NEXT_PUBLIC_TALLY_EVENTS_URL,
});

export function TallyAnalytics() {
  return <AnalyticsAppRouter />;
}
