// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import PublicDemoDashboard from "../components/demo/public-demo-dashboard";
import {
  publicDemoLiveEvents,
  publicDemoOverview,
  publicDemoProject,
  publicDemoQuestions,
  publicDemoSessions,
} from "../lib/demo/public-demo-data";

function renderDemo() {
  return render(
    React.createElement(PublicDemoDashboard, {
      project: publicDemoProject,
      overview: publicDemoOverview,
      liveEvents: publicDemoLiveEvents,
      sessions: publicDemoSessions,
      questions: publicDemoQuestions,
    }),
  );
}

describe("public demo dashboard", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders the default overview with banner, summary, metrics, and Ask Tally entry", () => {
    renderDemo();

    expect(screen.getByText("This is demo data. Connect your repo for real analytics.")).toBeTruthy();
    expect(screen.getByText("Acme Forms")).toBeTruthy();
    expect(screen.getByText(/See what Tally can answer/)).toBeTruthy();
    expect(screen.getByText("Page views")).toBeTruthy();
    expect(screen.getByText("18,420")).toBeTruthy();
    expect(screen.getByRole("tablist")).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Overview" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("button", { name: /ask tally/i })).toBeTruthy();
  });

  it("switches to Live and Sessions views without calling fetch", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const user = userEvent.setup();

    renderDemo();

    await user.click(screen.getByRole("tab", { name: "Live" }));
    expect(screen.getByText("form_started")).toBeTruthy();
    expect(screen.getByText("/templates/customer-feedback")).toBeTruthy();

    await user.click(screen.getByRole("tab", { name: "Sessions" }));
    expect(screen.getByText("Total sessions")).toBeTruthy();
    expect(screen.getByText("New visitors")).toBeTruthy();
    expect(screen.getByText("Returning visitors")).toBeTruthy();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("requires input before submitting Ask Tally and exposes validation accessibly", async () => {
    const user = userEvent.setup();

    renderDemo();
    await user.click(screen.getByRole("tab", { name: "Ask Tally" }));
    await user.click(screen.getByRole("button", { name: "Ask question" }));

    expect(screen.getByRole("alert").textContent).toContain("Choose or type a demo question");
  });

  it("returns deterministic results for all suggested questions", async () => {
    const user = userEvent.setup();

    renderDemo();
    await user.click(screen.getByRole("tab", { name: "Ask Tally" }));

    for (const question of publicDemoQuestions) {
      await user.click(screen.getByRole("button", { name: question }));
      expect(screen.getAllByText(question).length).toBeGreaterThan(0);
    }
  });

  it("renders the missing tracking task and simulated MCP output", async () => {
    const user = userEvent.setup();

    renderDemo();
    await user.click(screen.getByRole("tab", { name: "Ask Tally" }));
    await user.click(screen.getByRole("button", { name: "What should we track next?" }));

    expect(screen.getAllByText("Track form publish completion").length).toBeGreaterThan(0);
    expect(screen.getByText("form_published")).toBeTruthy();
    expect(screen.getByText("Simulated MCP/agent output")).toBeTruthy();
    expect(document.querySelector("[aria-live='polite']")).toBeTruthy();
  });

  it("renders an unrecognized deterministic response with suggestions", async () => {
    const user = userEvent.setup();

    renderDemo();
    await user.click(screen.getByRole("tab", { name: "Ask Tally" }));
    await user.type(screen.getByLabelText("Ask Tally a question"), "Can you forecast revenue?");
    await user.click(screen.getByRole("button", { name: "Ask question" }));

    expect(screen.getByText("Try one of the demo questions")).toBeTruthy();
    expect(screen.getByText("This public demo uses deterministic example answers instead of an LLM.")).toBeTruthy();
  });
});
