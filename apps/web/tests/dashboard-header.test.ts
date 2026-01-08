import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import DashboardHeader from "../components/dashboard/header";

describe("DashboardHeader", () => {
  it("renders a logout button when no user is provided", () => {
    const html = renderToStaticMarkup(React.createElement(DashboardHeader));

    expect(html).toContain('action="/api/auth/logout"');
    expect(html).toContain("Log out");
    expect(html).not.toContain("user-dropdown-trigger");
  });

  it("renders the UserDropdown when user is provided", () => {
    const html = renderToStaticMarkup(
      React.createElement(DashboardHeader, { user: { username: "emriedel", avatarUrl: null } }),
    );

    expect(html).toContain("user-dropdown-trigger");
    expect(html).toContain("emriedel");
    expect(html).not.toContain('action="/api/auth/logout"');
  });
});

