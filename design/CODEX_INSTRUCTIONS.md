# Codex CLI Implementation Guide

## What You Have

Your `/design` folder contains:

```
/design
  /screens              # PNG mockups from Stitch
    01-landing-page.png
    02-dashboard-overview.png
    03-pricing-page.png
    04-how-it-works.png
    05-docs-landing.png
    06-docs-setup.png
  /html                 # Reference HTML/Tailwind from Stitch
    01-landing-page.html
    02-dashboard-overview.html
    03-pricing-page.html
    04-how-it-works.html
    05-docs-landing.html
    06-docs-setup.html
  DESIGN_SYSTEM.md      # Color tokens, patterns, components
```

**Key advantage:** You have both visual mockups AND working HTML/Tailwind code. Codex can reference both.

---

## Step 1: Setup (Run First)

Copy the design folder to your project root, then run this command:

```bash
codex "Update tailwind.config.js with the extended theme from /design/DESIGN_SYSTEM.md. Add the colors (primary, primary-hover, primary-light, background-light, surface-light, surface-dark, text-main, text-muted, border-color), shadows (warm, warm-lg), font family (Inter), and border radius values. Also add the Inter font import to the app."
```

---

## Step 2: Implement Screens

### Recommended Order

1. **Tailwind config** (Step 1 above)
2. **Dashboard shell/layout** — sidebar, header structure
3. **Dashboard overview** — most complex, establishes patterns
4. **Landing page** — marketing pages
5. **Pricing page**
6. **Docs pages**

---

## Screen-by-Screen Prompts

### Dashboard Layout + Overview

```
Implement the dashboard layout and overview page based on the Stitch design.

VISUAL REFERENCE: /design/screens/02-dashboard-overview.png
HTML REFERENCE: /design/html/02-dashboard-overview.html
DESIGN SYSTEM: /design/DESIGN_SYSTEM.md

FILES TO UPDATE:
- /apps/web/app/(dashboard)/layout.tsx
- /apps/web/components/dashboard/sidebar.tsx
- /apps/web/components/dashboard/header.tsx
- /apps/web/app/(dashboard)/projects/[id]/overview/page.tsx
- /apps/web/components/dashboard/stat-card.tsx
- /apps/web/components/dashboard/page-views-chart.tsx
- /apps/web/components/dashboard/top-list.tsx

REQUIREMENTS:
1. Sidebar (left, 256px wide):
   - Logo with teal icon and "Tally Analytics" text
   - Navigation: Dashboard (active), Realtime, Reports, Settings
   - Active state: bg-primary/10, text-primary
   - Bottom: Plan info card with usage bar and "Upgrade Plan" button

2. Main area:
   - Header with breadcrumb (Projects / project-name), Live badge, Refresh and date picker buttons
   - 4 stat cards in a row: Total Visitors, Pageviews, Bounce Rate, Avg Visit Time
   - Each stat shows value, percentage change with trend icon
   - Visitor Growth chart with teal line and gradient fill
   - Two-column grid: Top Pages table, Top Sources table with progress bars

3. Use the exact colors from DESIGN_SYSTEM.md
4. Reference the HTML file for Tailwind class patterns
5. Keep existing data fetching logic, just update the UI

Use Recharts for the chart. Use Material Symbols or Lucide icons.
```

### Landing Page

```
Implement the landing/marketing page based on the Stitch design.

VISUAL REFERENCE: /design/screens/01-landing-page.png
HTML REFERENCE: /design/html/01-landing-page.html
DESIGN SYSTEM: /design/DESIGN_SYSTEM.md

FILES TO UPDATE:
- /apps/web/app/(marketing)/page.tsx
- /apps/web/app/(marketing)/layout.tsx
- /apps/web/components/marketing/hero.tsx
- /apps/web/components/marketing/features.tsx
- Create: /apps/web/components/marketing/navbar.tsx
- Create: /apps/web/components/marketing/how-it-works.tsx
- Create: /apps/web/components/marketing/testimonial.tsx
- Create: /apps/web/components/marketing/footer.tsx

SECTIONS TO IMPLEMENT:

1. Navbar:
   - Logo left, nav links center (Documentation, Pricing, GitHub), Login + Get Started buttons right
   - "Get Started" is teal filled button

2. Hero:
   - "V2.0 IS NOW LIVE" badge
   - Headline: "Privacy-friendly analytics for Next.js, automated."
   - Subhead about GitHub PR flow
   - Two buttons: "Connect GitHub" (teal), "Read the Docs" (outline)
   - Dashboard screenshot in browser mockup below

3. Social proof:
   - "Trusted by developers building on the modern web"
   - Logo row: Vercel, Stripe, Raycast, Linear (use placeholder text/icons)

4. Features section:
   - "Analytics without the headache" headline
   - 3 feature cards: Zero Configuration, GDPR Compliant, Ultra Lightweight
   - Cards have teal icons, white background, subtle border

5. How it works (reference /design/screens/04-how-it-works.png):
   - 3 steps: Connect Repository, Merge the PR, See Insights
   - Connected by dashed line
   - Dashboard preview below

6. Testimonial:
   - Quote with quotation marks
   - Avatar, name, title

7. CTA section:
   - "Ready to respect your users?"
   - Two buttons

8. Footer:
   - Logo, copyright, links (Privacy Policy, Terms, Twitter, GitHub)

Use colors and patterns from DESIGN_SYSTEM.md. Reference the HTML for exact Tailwind classes.
```

### Pricing Page

```
Implement the pricing page based on the Stitch design.

VISUAL REFERENCE: /design/screens/03-pricing-page.png
HTML REFERENCE: /design/html/03-pricing-page.html
DESIGN SYSTEM: /design/DESIGN_SYSTEM.md

FILES TO UPDATE:
- /apps/web/app/(marketing)/pricing/page.tsx
- /apps/web/components/marketing/pricing-card.tsx

REQUIREMENTS:

1. Header:
   - "Simple, transparent pricing" headline (large, centered)
   - Subhead: "Start free, upgrade when you need more. No credit card required."

2. Three pricing cards:

   FREE:
   - "Free" title
   - "$0 /month"
   - "Start for free" button (outline style)
   - Features with teal checkmarks:
     • 1 project
     • 5k monthly views
     • Community support
     • Basic analytics
   - "Automated GitHub PRs" with X (not included)

   PRO (highlighted):
   - "Most popular" teal badge
   - "Pro" title
   - "$19 /month"
   - "Start 14-day trial" button (teal filled)
   - Features:
     • Unlimited projects
     • 100k monthly views
     • Priority email support
     • Automated GitHub PRs
     • Next.js 13+ support

   TEAM:
   - "Team" title
   - "Custom" price
   - "Contact Sales" button (dark/outline)
   - Features:
     • SSO & SAML
     • Unlimited views
     • SLA Guarantee
     • Dedicated Success Manager
     • Audit logs

3. FAQ accordion section:
   - "Frequently asked questions"
   - Expandable items with chevron icons
   - Questions: GitHub PR integration, GDPR compliance, cancellation, page view counting

4. Footer (same as landing page)

Reference the HTML for the exact card structure and Tailwind classes.
```

### Documentation Pages

```
Implement the documentation pages based on the Stitch designs.

VISUAL REFERENCES: 
- /design/screens/05-docs-landing.png
- /design/screens/06-docs-setup.png

HTML REFERENCES:
- /design/html/05-docs-landing.html
- /design/html/06-docs-setup.html

DESIGN SYSTEM: /design/DESIGN_SYSTEM.md

FILES TO UPDATE:
- /apps/web/app/(marketing)/docs/page.tsx
- /apps/web/app/(marketing)/docs/layout.tsx
- /apps/web/app/(marketing)/docs/setup/page.tsx
- /apps/web/app/(marketing)/docs/sdk/page.tsx

REQUIREMENTS:

1. Docs Layout:
   - Left sidebar with navigation sections:
     • GUIDE: Getting Started, Installation, Configuration
     • API REFERENCE: SDK Reference, API Integration
     • RESOURCES: Troubleshooting, Changelog
   - Active item has teal left border and tinted background
   - Main content area with search bar at top

2. Docs Landing (/docs):
   - "Documentation" headline
   - Description text
   - npm install command in dark code block with copy button
   - "Quick Start" section with 4 cards:
     • Installation
     • Configuration
     • Next.js Integration
     • GitHub Automation
   - Each card has teal icon, title, description, arrow

3. Setup Page (/docs/setup):
   - Breadcrumb: Docs > Installation > Setup
   - "Setting up Tally Analytics" title
   - "Estimated read time: 5 min" badge
   - Numbered sections:
     1. Prerequisites (with checkmark list)
     2. Install GitHub App (with button)
     3. Review Pull Request (with code block showing tally.config.ts)
     4. Verify Installation
   - Code blocks: dark background (#292524), syntax highlighting
   - "Important" callout box with amber/orange styling
   - Previous/Next navigation at bottom
   - "Was this guide helpful?" feedback

Use the HTML references for exact Tailwind classes and structure.
```

---

## Tips for Best Results

### 1. Reference Both Files
Tell Codex to look at both the image AND the HTML:
```
"Match the visual design in /design/screens/02-dashboard-overview.png and use the Tailwind patterns from /design/html/02-dashboard-overview.html"
```

### 2. Extract Components
The HTML files are single-page. Tell Codex to break them into React components:
```
"Extract the sidebar from the HTML into a reusable Sidebar.tsx component"
```

### 3. Preserve Logic
Emphasize keeping existing functionality:
```
"Keep all existing data fetching and API calls. Only update the visual presentation."
```

### 4. Use Design Tokens
Reference the design system for consistency:
```
"Use the color tokens from DESIGN_SYSTEM.md (text-main, text-muted, primary, etc.)"
```

### 5. Icons
The Stitch HTML uses Material Symbols. You can either:
- Keep Material Symbols: Add the font link to your layout
- Switch to Lucide: Tell Codex to substitute equivalent Lucide icons

```
"Replace Material Symbols icons with Lucide React equivalents (dashboard → LayoutDashboard, settings → Settings, etc.)"
```

---

## Quick Reference: Key Classes from Stitch

```css
/* Backgrounds */
bg-background-light    /* #fafaf8 - page background */
bg-surface-light       /* #ffffff - cards */
bg-surface-dark        /* #292524 - code blocks */

/* Text */
text-text-main         /* #292524 - headlines */
text-text-muted        /* #57534e - body text */
text-primary           /* #14b8a6 - links, active */

/* Borders */
border-border-color    /* #e7e5e4 */

/* Shadows */
shadow-warm            /* subtle card shadow */
shadow-warm-lg         /* elevated shadow */

/* Active navigation */
bg-primary/10 text-primary

/* Buttons */
bg-primary text-white hover:bg-primary-hover     /* primary */
border border-border-color bg-white shadow-warm  /* secondary */
```

---

## Verification Checklist

After each screen, verify:

- [ ] Colors match the design system tokens
- [ ] Fonts are Inter
- [ ] Border radius is 4px (sharp, not rounded)
- [ ] Shadows use warm tones (not blue-tinted)
- [ ] Active states use primary/10 background with primary text
- [ ] Cards have border-border-color and shadow-warm
- [ ] Existing functionality still works
