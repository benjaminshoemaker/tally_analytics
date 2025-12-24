import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import DashboardLayout from "../app/(dashboard)/layout";

describe("dashboard shell layout", () => {
  it("renders navigation and a logout form", () => {
    const html = renderToStaticMarkup(
      React.createElement(DashboardLayout, {
        children: React.createElement("div", null, "Hello dashboard"),
      }),
    );

    expect(html).toContain("Projects");
    expect(html).toContain('href="/projects"');
    expect(html).toContain("Settings");
    expect(html).toContain('href="/settings"');
    expect(html).toContain('action="/api/auth/logout"');
    expect(html).toContain('method="post"');
    expect(html).toContain("Hello dashboard");
  });
});

