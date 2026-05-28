import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("design system tailwind extension", () => {
  it("extends the Tailwind theme with the design system tokens", async () => {
    const mod = (await import("../tailwind.config.js")) as any;
    const config = mod?.default ?? mod;

    expect(config.darkMode).toBe("class");
    expect(config.theme?.extend).toBeDefined();

    const colors = config.theme.extend.colors;
    expect(colors).toMatchObject({
      primary: "#0f766e",
      "primary-hover": "#115e59",
      "primary-light": "#ccfbf1",
      "background-light": "#fcfaf8",
      "surface-light": "#ffffff",
      "surface-dark": "#292524",
      "text-main": "#1b140d",
      "text-muted": "#57534e",
      "border-color": "#e8e0d9",
    });

    expect(config.theme.extend.fontFamily).toMatchObject({
      display: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
      sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
    });

    expect(config.theme.extend.borderRadius).toMatchObject({
      DEFAULT: "4px",
      sm: "2px",
      md: "4px",
      lg: "6px",
      xl: "8px",
      full: "9999px",
    });

    expect(config.theme.extend.boxShadow).toMatchObject({
      warm: "0 2px 8px 0 rgba(40, 30, 20, 0.04), 0 1px 2px -1px rgba(40, 30, 20, 0.04)",
      "warm-lg": "0 10px 15px -3px rgba(40, 30, 20, 0.05), 0 4px 6px -2px rgba(40, 30, 20, 0.025)",
    });
  });

  it("loads the Inter font in the Next.js app layout", () => {
    const layoutPath = path.join(__dirname, "..", "app", "layout.tsx");
    const contents = fs.readFileSync(layoutPath, "utf8");

    expect(contents).toContain("from 'next/font/google'");
    expect(contents).toContain("Inter(");
    expect(contents).toContain("variable: '--font-inter'");
    expect(contents).not.toContain("Lora(");
    expect(contents).not.toContain("--font-lora");
  });
});
