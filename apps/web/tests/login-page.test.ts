import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import LoginPage from "../app/login/page";

describe("/login page", () => {
  it("renders a GitHub OAuth login CTA linking to /api/auth/github", () => {
    const html = renderToStaticMarkup(React.createElement(LoginPage));

    expect(html).toContain('href="/api/auth/github"');
    expect(html.toLowerCase()).toContain("sign in with github");
    expect(html).not.toContain("/api/auth/magic-link");
    expect(html).not.toContain('type="email"');
  });
});
