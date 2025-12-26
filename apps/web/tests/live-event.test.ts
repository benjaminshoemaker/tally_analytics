import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import LiveEvent from "../components/dashboard/live-event";

describe("LiveEvent", () => {
  it("stacks timestamp on small screens", () => {
    const html = renderToStaticMarkup(
      React.createElement(LiveEvent, {
        isNew: false,
        event: {
          id: "e1",
          eventType: "page_view",
          path: "/some/path",
          referrer: null,
          timestamp: "2025-01-01T00:00:00.000Z",
          relativeTime: "3 seconds ago",
        },
      }),
    );

    expect(html).toContain("flex-col");
    expect(html).toContain("sm:flex-row");
    expect(html).toContain("page_view");
    expect(html).toContain("3 seconds ago");
  });
});

