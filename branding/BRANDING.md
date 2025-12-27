# Tally Analytics — Brand & Marketing Guide

## Product Name

**Tally Analytics** (or just **Tally** in casual contexts)

---

## Logo & Wordmark

### Primary Logo
Use `logo.svg` — Emerald icon with dark text on light backgrounds.

### Dark Mode Logo  
Use `logo-dark.svg` — Emerald icon with white text on dark backgrounds.

### Icon Only
Use `favicon.svg` — Emerald square with white tally marks.

### Asset Files
| File | Usage |
|------|-------|
| `logo.svg` | Primary wordmark (light backgrounds) |
| `logo-dark.svg` | Wordmark for dark backgrounds |
| `favicon.svg` | Browser favicon |
| `apple-touch-icon.svg` | iOS home screen icon (convert to 180x180 PNG) |
| `og-image.svg` | Social sharing preview (convert to 1200x630 PNG) |

---

## Colors

### Primary Palette
| Name | Hex | Usage |
|------|-----|-------|
| **Emerald** | `#10b981` | Primary brand color, CTAs, accents |
| **Emerald Dark** | `#059669` | Hover states, emphasis |
| **Emerald Light** | `#d1fae5` | Backgrounds, highlights |

### Neutral Palette
| Name | Hex | Usage |
|------|-----|-------|
| **Slate 900** | `#0f172a` | Primary text |
| **Slate 700** | `#334155` | Secondary text |
| **Slate 500** | `#64748b` | Muted text, captions |
| **Slate 200** | `#e2e8f0` | Borders, dividers |
| **Slate 50** | `#f8fafc` | Page background |
| **White** | `#ffffff` | Cards, surfaces |

### Tailwind Config
```javascript
colors: {
  primary: {
    DEFAULT: '#10b981',
    dark: '#059669',
    light: '#d1fae5',
  }
}
```

---

## Hero Copy

### Headline
```
Analytics for Next.js, installed in one click
```

### Subhead
```
Add Tally to your GitHub repo and get a PR with privacy-friendly 
analytics. No config, no SDK wrangling, no cookies banner needed.
```

### Primary CTA
```
Add to GitHub
```

### Secondary CTA
```
View Demo
```

**Demo link (placeholder for now):** `/demo` (not implemented yet)

---

## Features List

### Feature 1: One-click install
```
Title: One-click install
Description: GitHub App adds analytics via PR, you just merge
Icon: MousePointerClick or Zap
```

### Feature 2: Privacy-first
```
Title: Privacy-first
Description: No cookies, respects Do Not Track, no consent banner needed
Icon: Shield or Lock
```

### Feature 3: Real-time dashboard
```
Title: Real-time dashboard
Description: See page views, top pages, referrers as they happen
Icon: Activity or BarChart
```

### Feature 4: Built for Next.js
```
Title: Built for Next.js
Description: Supports App Router and Pages Router automatically
Icon: Code or Layers
```

### Feature 5: Lightweight SDK
```
Title: Lightweight SDK
Description: Under 2KB, no impact on Core Web Vitals
Icon: Feather or Gauge
```

### Feature 6: Your data, your database
```
Title: Your data, your database
Description: Powered by Tinybird, full data ownership
Icon: Database or Server
```

---

## Pricing Tiers

### Free
```
Name: Free
Price: $0
Price suffix: forever

Limits:
- 10,000 events/month
- 3 projects
- 90-day data retention
- Community support

CTA: Get Started
```

### Pro
```
Name: Pro
Price: $9
Price suffix: /month

Limits:
- 100,000 events/month
- 10 projects
- Unlimited data retention
- Email support

CTA: Start Free Trial
Highlight: Most Popular
```

### Team
```
Name: Team
Price: $29
Price suffix: /month

Limits:
- 1,000,000 events/month
- Unlimited projects
- Unlimited data retention
- Priority support

CTA: Start Free Trial
```

### Pricing JSON (for code)
```json
{
  "tiers": [
    {
      "name": "Free",
      "price": 0,
      "priceLabel": "$0",
      "priceSuffix": "forever",
      "events": 10000,
      "eventsLabel": "10,000 events/mo",
      "projects": 3,
      "retention": "90 days",
      "support": "Community",
      "cta": "Get Started",
      "highlighted": false
    },
    {
      "name": "Pro",
      "price": 9,
      "priceLabel": "$9",
      "priceSuffix": "/month",
      "events": 100000,
      "eventsLabel": "100,000 events/mo",
      "projects": 10,
      "retention": "Unlimited",
      "support": "Email",
      "cta": "Start Free Trial",
      "highlighted": true
    },
    {
      "name": "Team",
      "price": 29,
      "priceLabel": "$29",
      "priceSuffix": "/month",
      "events": 1000000,
      "eventsLabel": "1,000,000 events/mo",
      "projects": "Unlimited",
      "retention": "Unlimited",
      "support": "Priority",
      "cta": "Start Free Trial",
      "highlighted": false
    }
  ]
}
```

---

## Typography

### Font Stack
```css
font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

Or use **Inter** from Google Fonts for a more polished look:
```css
font-family: 'Inter', system-ui, sans-serif;
```

### Weights
- **400** — Body text
- **500** — Subheads, emphasis
- **600** — Headings, buttons
- **700** — Hero headlines

---

## Voice & Tone

### Principles
- **Clear over clever** — Say what the product does, simply
- **Confident, not boastful** — State facts, skip superlatives  
- **Developer-friendly** — Technical accuracy, no hand-waving
- **Concise** — Respect the reader's time

### Do
- "Add analytics in one click"
- "No cookies required"
- "See what's happening now"

### Don't
- "Revolutionary analytics platform"
- "Best-in-class solution"
- "Cutting-edge technology"

---

## Social & Meta

### Title Tag
```
Tally — Analytics for Next.js
```

### Meta Description
```
Add privacy-friendly analytics to your Next.js app in one click. 
No cookies, no config, no consent banner needed.
```

### OG Tags
```html
<meta property="og:title" content="Tally — Analytics for Next.js" />
<meta property="og:description" content="Add privacy-friendly analytics to your Next.js app in one click." />
<meta property="og:image" content="https://usetally.xyz/og-image.png" />
<meta property="og:url" content="https://usetally.xyz" />
<meta name="twitter:card" content="summary_large_image" />
```

---

## Domain & URLs

| Purpose | URL |
|---------|-----|
| Marketing site | `https://usetally.xyz` |
| Dashboard (same domain) | `https://usetally.xyz/projects` (authenticated) |
| Event ingestion | `https://events.usetally.xyz` |
| Docs | `https://usetally.xyz/docs` |

## GitHub App Install Link

`https://github.com/apps/tally-analytics-agent`

---

## Quick Reference for Codex CLI

```yaml
product_name: "Tally Analytics"
logo_file: "logo.svg"
favicon_file: "favicon.svg"

colors:
  primary: "#10b981"
  primary_dark: "#059669"
  primary_light: "#d1fae5"
  text: "#0f172a"
  text_muted: "#64748b"
  background: "#f8fafc"

hero:
  headline: "Analytics for Next.js, installed in one click"
  subhead: "Add Tally to your GitHub repo and get a PR with privacy-friendly analytics. No config, no SDK wrangling, no cookies banner needed."
  cta: "Add to GitHub"

features:
  - title: "One-click install"
    description: "GitHub App adds analytics via PR, you just merge"
  - title: "Privacy-first"
    description: "No cookies, respects Do Not Track, no consent banner needed"
  - title: "Real-time dashboard"
    description: "See page views, top pages, referrers as they happen"
  - title: "Built for Next.js"
    description: "Supports App Router and Pages Router automatically"
  - title: "Lightweight SDK"
    description: "Under 2KB, no impact on Core Web Vitals"
  - title: "Your data, your database"
    description: "Powered by Tinybird, full data ownership"

pricing:
  - name: "Free"
    price: "$0"
    events: "10,000/mo"
    projects: 3
    retention: "90 days"
    support: "Community"
  - name: "Pro"
    price: "$9/mo"
    events: "100,000/mo"
    projects: 10
    retention: "Unlimited"
    support: "Email"
    highlighted: true
  - name: "Team"
    price: "$29/mo"
    events: "1,000,000/mo"
    projects: "Unlimited"
    retention: "Unlimited"
    support: "Priority"
```
