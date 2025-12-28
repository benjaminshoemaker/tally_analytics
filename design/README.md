# Tally Analytics Design Package

Design assets exported from Google Stitch for implementation with Codex CLI.

## Contents

```
/design
├── screens/                    # Visual mockups (PNG)
│   ├── 01-landing-page.png
│   ├── 02-dashboard-overview.png
│   ├── 03-pricing-page.png
│   ├── 04-how-it-works.png
│   ├── 05-docs-landing.png
│   └── 06-docs-setup.png
├── html/                       # Reference HTML/Tailwind code
│   ├── 01-landing-page.html
│   ├── 02-dashboard-overview.html
│   ├── 03-pricing-page.html
│   ├── 04-how-it-works.html
│   ├── 05-docs-landing.html
│   └── 06-docs-setup.html
├── DESIGN_SYSTEM.md            # Color tokens, typography, component patterns
├── CODEX_INSTRUCTIONS.md       # Step-by-step prompts for Codex CLI
└── README.md                   # This file
```

## Quick Start

1. **Copy this folder** to your Tally Analytics project root as `/design`

2. **Update Tailwind config** (run in project root):
   ```bash
   codex "Update tailwind.config.js with the theme extension from /design/DESIGN_SYSTEM.md"
   ```

3. **Implement screens** one by one using prompts from `CODEX_INSTRUCTIONS.md`

## Screen Reference

| # | Screen | Description |
|---|--------|-------------|
| 01 | Landing Page | Full marketing homepage with hero, features, testimonials |
| 02 | Dashboard Overview | Main analytics dashboard with stats, charts, tables |
| 03 | Pricing Page | Three-tier pricing with FAQ accordion |
| 04 | How It Works | 3-step onboarding flow section |
| 05 | Docs Landing | Documentation homepage with quick start cards |
| 06 | Docs Setup | Step-by-step setup guide with code blocks |

## Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#14b8a6` | CTAs, active states, links |
| `primary-hover` | `#0d9488` | Hover states |
| `background-light` | `#fafaf8` | Page backgrounds |
| `surface-light` | `#ffffff` | Cards, panels |
| `text-main` | `#292524` | Headlines |
| `text-muted` | `#57534e` | Body text |
| `border-color` | `#e7e5e4` | Borders, dividers |

## Tips

- The HTML files contain working Tailwind code — reference them for exact class names
- Screens can be opened in a browser to see the full design
- All designs use Inter font (Google Fonts)
- Use Lucide React icons as a substitute for Material Symbols if preferred
