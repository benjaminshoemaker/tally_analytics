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
      'description: "Add privacy-friendly analytics to your Next.js app in one click. No consent banner needed, no complex setup."',
    );
    expect(src).toContain('openGraph: {');
    expect(src).toContain('title: "Tally — Analytics for Next.js"');
    expect(src).toContain('url: "https://usetally.xyz"');
    expect(src).toContain('siteName: "Tally Analytics"');
    expect(src).toContain('images: [{ url: "/og-image.png"');
    expect(src).toContain('twitter: {');
    expect(src).toContain('card: "summary_large_image"');
    expect(src).toContain('images: ["/og-image.png"]');
  });
});

