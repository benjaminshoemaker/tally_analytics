import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import LoginPage from "../app/login/page";

describe("/login page", () => {
  it("renders an email login form that posts to /api/auth/magic-link", () => {
    const html = renderToStaticMarkup(React.createElement(LoginPage));

    expect(html).toContain("<form");
    expect(html).toContain('action="/api/auth/magic-link"');
    expect(html).toContain('type="email"');
    expect(html).toContain('name="email"');
  });
});

