import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("root layout metadata", () => {
  it("defines OpenGraph + Twitter metadata", () => {
    const src = fs.readFileSync(path.join(__dirname, "..", "app", "layout.tsx"), "utf8");

    expect(src).toContain('metadataBase: new URL("https://usetally.xyz")');
    expect(src).toContain('default: "Tally Analytics"');
    expect(src).toContain('template: "%s | Tally Analytics"');
    expect(src).toContain(
      'description: "Add analytics from your AI coding agent, then understand usage in the Tally dashboard."',
    );
    expect(src).toContain('openGraph: {');
    expect(src).toContain('title: "Tally — Analytics from your AI coding agent"');
    expect(src).toContain('url: "https://usetally.xyz"');
    expect(src).toContain('siteName: "Tally Analytics"');
    expect(src).toContain('images: [{ url: "/og-image.png"');
    expect(src).toContain('twitter: {');
    expect(src).toContain('title: "Tally — Analytics from your AI coding agent"');
    expect(src).toContain('card: "summary_large_image"');
    expect(src).toContain('images: ["/og-image.png"]');
  });
});
