// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import UserDropdown from "../components/dashboard/user-dropdown";

describe("UserDropdown", () => {
  afterEach(() => cleanup());

  it("toggles open/closed when clicking the trigger", async () => {
    const user = userEvent.setup();
    render(React.createElement(UserDropdown, { username: "emriedel", avatarUrl: null }));

    expect(screen.queryByTestId("user-dropdown-menu")).toBeNull();

    await user.click(screen.getByTestId("user-dropdown-trigger"));
    expect(screen.getByTestId("user-dropdown-menu")).toBeTruthy();
    expect(screen.getByTestId("user-dropdown-chevron").classList.contains("rotate-180")).toBe(true);

    await user.click(screen.getByTestId("user-dropdown-trigger"));
    expect(screen.queryByTestId("user-dropdown-menu")).toBeNull();
  });

  it("closes when clicking outside", async () => {
    const user = userEvent.setup();
    render(
      React.createElement("div", null,
        React.createElement(UserDropdown, { username: "emriedel", avatarUrl: null }),
        React.createElement("button", { type: "button" }, "Outside"),
      ),
    );

    await user.click(screen.getByTestId("user-dropdown-trigger"));
    expect(screen.getByTestId("user-dropdown-menu")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Outside" }));
    expect(screen.queryByTestId("user-dropdown-menu")).toBeNull();
  });

  it("closes when pressing Escape", async () => {
    const user = userEvent.setup();
    render(React.createElement(UserDropdown, { username: "emriedel", avatarUrl: null }));

    await user.click(screen.getByTestId("user-dropdown-trigger"));
    expect(screen.getByTestId("user-dropdown-menu")).toBeTruthy();

    await user.keyboard("{Escape}");
    expect(screen.queryByTestId("user-dropdown-menu")).toBeNull();
  });

  it("renders an avatar image when avatarUrl is provided; otherwise renders an initial", () => {
    const { rerender } = render(React.createElement(UserDropdown, { username: "emriedel", avatarUrl: "https://example/avatar.png" }));
    expect(screen.getByAltText("emriedel avatar")).toBeTruthy();

    rerender(React.createElement(UserDropdown, { username: "emriedel", avatarUrl: null }));
    expect(screen.queryByAltText("emriedel avatar")).toBeNull();
    expect(screen.getByText("E")).toBeTruthy();
  });

  it("includes a logout form posting to /api/auth/logout", async () => {
    const user = userEvent.setup();
    render(React.createElement(UserDropdown, { username: "emriedel", avatarUrl: null }));

    await user.click(screen.getByTestId("user-dropdown-trigger"));
    const form = document.querySelector('form[action="/api/auth/logout"][method="post"]');
    expect(form).toBeTruthy();
    expect(screen.getByRole("button", { name: /log out/i })).toBeTruthy();
  });
});
