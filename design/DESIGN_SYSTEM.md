# Tally Analytics Design System

Extracted from Stitch design exports. Use this as the source of truth for implementation.

---

## Tailwind Config Extension

Add this to your `tailwind.config.js`:

```javascript
module.exports = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Primary accent
        primary: "#14b8a6",           // Teal 500
        "primary-hover": "#0d9488",   // Teal 600
        "primary-light": "#ccfbf1",   // Teal 100
        
        // Backgrounds
        "background-light": "#fafaf8", // Warm White
        "background-dark": "#1c1917",  // Stone 900
        
        // Surfaces (cards, panels)
        "surface-light": "#ffffff",
        "surface-dark": "#292524",     // Stone 800
        
        // Text
        "text-main": "#292524",        // Stone 800 (Warm Black)
        "text-muted": "#57534e",       // Stone 600 (Warm Gray)
        
        // Borders
        "border-color": "#e7e5e4",     // Stone 200
      },
      fontFamily: {
        display: ["Inter", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "4px",
        sm: "2px",
        md: "4px",
        lg: "6px",
        xl: "8px",
        full: "9999px",
      },
      boxShadow: {
        warm: "0 2px 8px 0 rgba(40, 30, 20, 0.04), 0 1px 2px -1px rgba(40, 30, 20, 0.04)",
        "warm-lg": "0 10px 15px -3px rgba(40, 30, 20, 0.05), 0 4px 6px -2px rgba(40, 30, 20, 0.025)",
      },
    },
  },
}
```

---

## Color Reference

### Primary Palette
| Name | Hex | Tailwind Class | Usage |
|------|-----|----------------|-------|
| Primary | `#14b8a6` | `bg-primary`, `text-primary` | CTAs, active states, links, icons |
| Primary Hover | `#0d9488` | `bg-primary-hover` | Hover states |
| Primary Light | `#ccfbf1` | `bg-primary-light` | Selection highlights, badges |

### Backgrounds
| Name | Hex | Tailwind Class | Usage |
|------|-----|----------------|-------|
| Background Light | `#fafaf8` | `bg-background-light` | Page background |
| Surface Light | `#ffffff` | `bg-surface-light` | Cards, panels |
| Surface Dark | `#292524` | `bg-surface-dark` | Code blocks, dark UI |

### Text
| Name | Hex | Tailwind Class | Usage |
|------|-----|----------------|-------|
| Text Main | `#292524` | `text-text-main` | Headlines, primary text |
| Text Muted | `#57534e` | `text-text-muted` | Body text, descriptions |

### Borders
| Name | Hex | Tailwind Class | Usage |
|------|-----|----------------|-------|
| Border Color | `#e7e5e4` | `border-border-color` | Card borders, dividers |

### Status Colors (from Stone palette)
| Status | Color | Usage |
|--------|-------|-------|
| Success | `#14b8a6` (primary) | Positive changes, success states |
| Warning | `#f59e0b` (amber-500) | Pending, attention needed |
| Error | `#ef4444` (red-500) | Errors, destructive actions |

---

## Typography

### Font
- **Family:** Inter (Google Fonts)
- **Fallback:** sans-serif

### Weights Used
- `400` — Body text
- `500` — Medium emphasis
- `600` — Semibold (subheads)
- `700` — Bold (headlines)

### Text Classes Pattern
```html
<!-- Headlines -->
<h1 class="text-text-main text-lg font-bold tracking-tight">...</h1>

<!-- Body -->
<p class="text-text-muted text-sm">...</p>

<!-- Links -->
<a class="text-primary text-sm font-semibold hover:underline">...</a>
```

---

## Shadows

```css
/* Default card shadow */
shadow-warm: 0 2px 8px 0 rgba(40, 30, 20, 0.04), 0 1px 2px -1px rgba(40, 30, 20, 0.04);

/* Elevated elements (dropdowns, modals) */
shadow-warm-lg: 0 10px 15px -3px rgba(40, 30, 20, 0.05), 0 4px 6px -2px rgba(40, 30, 20, 0.025);
```

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `rounded` | 4px | Default for cards, buttons |
| `rounded-sm` | 2px | Subtle rounding |
| `rounded-lg` | 6px | Larger elements |
| `rounded-full` | 9999px | Pills, avatars |

---

## Common Component Patterns

### Card
```html
<div class="bg-surface-light rounded shadow-warm border border-border-color p-6">
  ...
</div>
```

### Primary Button
```html
<button class="bg-primary text-white px-4 py-2 rounded font-medium hover:bg-primary-hover transition-colors">
  Button Text
</button>
```

### Secondary/Outline Button
```html
<button class="border border-border-color bg-white text-text-main px-4 py-2 rounded font-medium hover:bg-stone-50 transition-colors shadow-warm">
  Button Text
</button>
```

### Active Nav Item
```html
<div class="px-3 py-2 rounded bg-primary/10 text-primary flex items-center gap-3">
  <span class="material-symbols-outlined">dashboard</span>
  <span class="text-sm font-medium">Dashboard</span>
</div>
```

### Inactive Nav Item
```html
<div class="px-3 py-2 rounded text-text-muted hover:bg-stone-100 hover:text-text-main flex items-center gap-3 cursor-pointer transition-colors">
  <span class="material-symbols-outlined">settings</span>
  <span class="text-sm font-medium">Settings</span>
</div>
```

### Stat Card
```html
<div class="bg-surface-light p-6 rounded shadow-warm border border-border-color">
  <p class="text-text-muted text-sm font-medium">Total Visitors</p>
  <p class="text-text-main text-3xl font-bold mt-1">12.5k</p>
  <span class="text-primary text-sm font-medium flex items-center gap-1 mt-2">
    <span class="material-symbols-outlined text-[16px]">trending_up</span>
    12%
  </span>
</div>
```

### Badge/Pill
```html
<!-- Teal/Success -->
<span class="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
  Live
</span>

<!-- Amber/Warning -->
<span class="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-xs font-medium">
  Pending
</span>
```

---

## Icons

The Stitch exports use **Material Symbols Outlined**:

```html
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
```

Usage:
```html
<span class="material-symbols-outlined">dashboard</span>
<span class="material-symbols-outlined">bar_chart</span>
<span class="material-symbols-outlined">settings</span>
```

**Alternative:** You can substitute with Lucide React icons for better React integration.

---

## Chart Gradient

For area charts:
```html
<defs>
  <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
    <stop offset="0%" stop-color="#14b8a6" stop-opacity="0.2"/>
    <stop offset="100%" stop-color="#14b8a6" stop-opacity="0"/>
  </linearGradient>
</defs>
```

Line: `stroke="#14b8a6" stroke-width="3"`
Fill: `fill="url(#chartGradient)"`

---

## Scrollbar Styling

```css
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #e7e5e4;
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: #d6d3d1;
}
```

---

## Screen Inventory

| File | Screen | Description |
|------|--------|-------------|
| `01-landing-page` | Marketing Home | Hero, features, how it works, testimonial, CTA |
| `02-dashboard-overview` | Dashboard | Stats, visitor chart, top pages, top sources |
| `03-pricing-page` | Pricing | Three tiers + FAQ accordion |
| `04-how-it-works` | How It Works Section | 3-step flow with dashboard preview |
| `05-docs-landing` | Documentation Home | Sidebar nav, quick start cards |
| `06-docs-setup` | Setup Guide | Step-by-step with code blocks |
