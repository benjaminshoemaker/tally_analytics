import { describe, expect, it } from "vitest";

import { ANALYSIS_POLL_INTERVAL_MS, getProjectRefetchIntervalMs } from "../lib/hooks/use-project";

describe("project polling behavior", () => {
  it("uses a 2s poll interval while analyzing", () => {
    expect(ANALYSIS_POLL_INTERVAL_MS).toBe(2000);
    expect(getProjectRefetchIntervalMs("analyzing")).toBe(2000);
  });

  it("does not poll outside analysis", () => {
    expect(getProjectRefetchIntervalMs("active")).toBe(false);
    expect(getProjectRefetchIntervalMs("analysis_failed")).toBe(false);
  });
});

