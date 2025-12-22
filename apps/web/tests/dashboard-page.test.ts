import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import DashboardPage from "../app/dashboard/page";

describe("/dashboard page", () => {
  it("renders a dashboard heading", () => {
    const html = renderToStaticMarkup(React.createElement(DashboardPage));
    expect(html).toContain("Dashboard");
  });
});

