import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import LoginPage from "../app/login/page";

describe("/login page (GitHub OAuth)", () => {
  it("links to /api/auth/github and includes Terms + Privacy links", () => {
    const html = renderToStaticMarkup(React.createElement(LoginPage));

    expect(html).toContain('href="/api/auth/github"');
    expect(html).toContain('href="/terms"');
    expect(html).toContain('href="/privacy"');
  });

  it("displays an error message for oauth_cancelled", () => {
    const html = renderToStaticMarkup(React.createElement(LoginPage, { searchParams: { error: "oauth_cancelled" } }));
    expect(html).toContain("GitHub sign-in was cancelled");
  });

  it("displays an error message for invalid_state", () => {
    const html = renderToStaticMarkup(React.createElement(LoginPage, { searchParams: { error: "invalid_state" } }));
    expect(html).toContain("That sign-in attempt expired");
  });

  it("displays an error message for github_error", () => {
    const html = renderToStaticMarkup(React.createElement(LoginPage, { searchParams: { error: "github_error" } }));
    expect(html).toContain("GitHub sign-in failed");
  });
});

