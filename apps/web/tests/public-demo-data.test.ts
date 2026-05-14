import { describe, expect, it } from "vitest";

import {
  matchDemoQuestion,
  publicDemoLiveEvents,
  publicDemoOverview,
  publicDemoProject,
  publicDemoQuestions,
  publicDemoSessions,
} from "../lib/demo/public-demo-data";

describe("public demo data", () => {
  it("exports Acme Forms fixture data with realistic pages and referrers", () => {
    expect(publicDemoProject.name).toBe("Acme Forms");
    expect(publicDemoOverview.topPages.map((page) => page.label)).toEqual(
      expect.arrayContaining(["/", "/pricing", "/templates", "/signup", "/docs"]),
    );
    expect(publicDemoOverview.topReferrers.map((referrer) => referrer.label)).toEqual(
      expect.arrayContaining(["Google", "GitHub", "Product Hunt", "Hacker News", "direct"]),
    );
    expect(publicDemoLiveEvents.map((event) => event.eventType)).toEqual(
      expect.arrayContaining(["page_view", "signup_started", "template_viewed", "pricing_cta_clicked", "form_started"]),
    );
    expect(publicDemoSessions.totalSessions).toBeGreaterThan(0);
  });

  it("normalizes case, whitespace, and terminal punctuation for suggested questions", () => {
    const canonical = matchDemoQuestion("What should we track next?");
    const normalized = matchDemoQuestion("   WHAT   should we   track next!!!   ");

    expect(normalized.kind).toBe(canonical.kind);
    expect(normalized.title).toBe(canonical.title);
    expect(publicDemoQuestions).toContain("What should we track next?");
  });

  it("returns the missing-tracking task for the tracking recommendation question", () => {
    const result = matchDemoQuestion("What should we track next?");

    expect(result.kind).toBe("cannot_answer_yet");
    expect(result.task?.eventName).toBe("form_published");
    expect(result.task?.title).toBe("Track form publish completion");
    expect(result.agentPreview?.label).toMatch(/simulated/i);
    expect(result.agentPreview?.verificationCriteria.join(" ")).toContain("form_published");
  });

  it("returns a deterministic unrecognized response with sample questions", () => {
    const result = matchDemoQuestion("Can you forecast next quarter revenue?");

    expect(result.kind).toBe("unrecognized");
    expect(result.title).toBe("Try one of the demo questions");
    expect(result.suggestedQuestions).toEqual(publicDemoQuestions);
  });
});
