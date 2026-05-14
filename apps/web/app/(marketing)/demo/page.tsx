import React from "react";

import PublicDemoDashboard from "../../../components/demo/public-demo-dashboard";
import {
  publicDemoLiveEvents,
  publicDemoOverview,
  publicDemoProject,
  publicDemoQuestions,
  publicDemoSessions,
} from "../../../lib/demo/public-demo-data";

export default function DemoPage() {
  return (
    <PublicDemoDashboard
      project={publicDemoProject}
      overview={publicDemoOverview}
      liveEvents={publicDemoLiveEvents}
      sessions={publicDemoSessions}
      questions={publicDemoQuestions}
    />
  );
}
