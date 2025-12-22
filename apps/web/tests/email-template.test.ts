import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MagicLinkEmail } from "../lib/email/templates";

describe("MagicLinkEmail", () => {
  it("renders HTML with login button, expiry notice, and disclaimer", () => {
    const loginUrl = "https://app.example.com/api/auth/verify?token=abc";
    const html = renderToStaticMarkup(React.createElement(MagicLinkEmail, { loginUrl }));

    expect(html).toContain(loginUrl);
    expect(html).toContain("Log in");
    expect(html).toContain("expires in 15 minutes");
    expect(html).toContain("didn&#x27;t request");
  });
});
