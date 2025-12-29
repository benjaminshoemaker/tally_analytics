# Tally Analytics Design System v2.0

This is the authoritative design system for Tally Analytics, derived from the approved HTML mockups. All components and pages should be converted to use this system for visual consistency.

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Tailwind Configuration](#tailwind-configuration)
3. [Color System](#color-system)
4. [Typography](#typography)
5. [Spacing & Layout](#spacing--layout)
6. [Border Radius](#border-radius)
7. [Shadows](#shadows)
8. [Icons](#icons)
9. [Component Patterns](#component-patterns)
10. [Page Layouts](#page-layouts)
11. [Animation & Transitions](#animation--transitions)
12. [Dark Mode](#dark-mode)
13. [Conversion Checklist](#conversion-checklist)

---

## Design Philosophy

### Core Principles

1. **Warm Minimalism** — Clean, uncluttered interfaces with warm, inviting tones
2. **Functional Elegance** — Every element serves a purpose; beauty through utility
3. **Consistent Restraint** — Minimal use of color; primary teal reserved for actions and emphasis
4. **Subtle Depth** — Warm shadows and borders create hierarchy without harsh contrast

### Visual Language

- **Background**: Warm off-white (`#fafaf8`) instead of pure white
- **Text**: Warm charcoal tones (stone palette) instead of cold blacks
- **Accent**: Teal (`#14b8a6`) as the single primary accent color
- **Surfaces**: Pure white cards with warm shadows on warm backgrounds
- **Borders**: Light stone borders (`#e7e5e4`) for subtle definition

---

## Tailwind Configuration

Update `tailwind.config.js` with the following:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary accent
        primary: "#14b8a6",           // Teal 500 - main CTA color
        "primary-hover": "#0d9488",   // Teal 600 - hover state
        "primary-dark": "#0f766e",    // Teal 700 - pressed state
        "primary-light": "#ccfbf1",   // Teal 100 - light backgrounds
        
        // Backgrounds
        "background-light": "#fafaf8", // Warm white - page background
        "background-dark": "#1c1917",  // Stone 900 - dark mode background
        
        // Surfaces (cards, panels)
        "surface-light": "#ffffff",    // Pure white - card background
        "surface-dark": "#292524",     // Stone 800 - dark mode cards
        
        // Text
        "text-main": "#292524",        // Stone 800 - primary text
        "text-muted": "#57534e",       // Stone 600 - secondary text
        "text-subtle": "#78716c",      // Stone 500 - tertiary text
        
        // Borders
        "border-color": "#e7e5e4",     // Stone 200 - default borders
        "border-strong": "#d6d3d1",    // Stone 300 - emphasis borders
        
        // Accent backgrounds
        "accent-bg": "#f0fdfa",        // Very light teal - highlight areas
        "accent-bg-warm": "#f3ede7",   // Warm tan - feature sections
      },
      fontFamily: {
        display: ["Inter", "system-ui", "sans-serif"],
        serif: ['"Playfair Display"', "Georgia", "serif"],
      },
      borderRadius: {
        DEFAULT: "4px",   // Standard radius
        sm: "2px",        // Subtle radius
        md: "4px",        // Same as default
        lg: "6px",        // Larger elements
        xl: "8px",        // Cards, modals
        "2xl": "12px",    // Large cards
        full: "9999px",   // Pills, avatars
      },
      boxShadow: {
        warm: "0 2px 8px 0 rgba(40, 30, 20, 0.04), 0 1px 2px -1px rgba(40, 30, 20, 0.04)",
        "warm-lg": "0 10px 15px -3px rgba(40, 30, 20, 0.05), 0 4px 6px -2px rgba(40, 30, 20, 0.025)",
        "warm-xl": "0 20px 25px -5px rgba(40, 30, 20, 0.06), 0 8px 10px -6px rgba(40, 30, 20, 0.03)",
      },
    },
  },
  plugins: [],
};
```

---

## Color System

### Primary Colors

| Token | Hex | CSS Variable | Usage |
|-------|-----|--------------|-------|
| `primary` | `#14b8a6` | `--color-primary` | CTAs, links, active states, icons |
| `primary-hover` | `#0d9488` | `--color-primary-hover` | Hover states on primary elements |
| `primary-dark` | `#0f766e` | `--color-primary-dark` | Pressed states, emphasis |
| `primary-light` | `#ccfbf1` | `--color-primary-light` | Selection highlights, light badges |

### Background Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `background-light` | `#fafaf8` | Page background |
| `surface-light` | `#ffffff` | Cards, panels, inputs |
| `accent-bg` | `#f0fdfa` | Light teal highlight areas |
| `accent-bg-warm` | `#f3ede7` | Feature sections, alternating areas |

### Text Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `text-main` | `#292524` | Headlines, primary body text |
| `text-muted` | `#57534e` | Secondary text, descriptions |
| `text-subtle` | `#78716c` | Placeholders, captions |

### Border Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `border-color` | `#e7e5e4` | Default borders, dividers |
| `border-strong` | `#d6d3d1` | Emphasis borders |

### Status Colors

| Status | Color | Usage |
|--------|-------|-------|
| Success | `#14b8a6` (primary) | Positive changes, success states |
| Warning | `#f59e0b` (amber-500) | Pending, attention needed |
| Error | `#ef4444` (red-500) | Errors, destructive actions |
| Info | `#3b82f6` (blue-500) | Informational messages |

---

## Typography

### Font Stack

```css
/* Primary font */
font-family: 'Inter', system-ui, -apple-system, sans-serif;

/* Display/accent font (optional, for marketing) */
font-family: 'Playfair Display', Georgia, serif;
```

### Google Fonts Import

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,600;1,600&display=swap" rel="stylesheet">
```

### Font Weights

| Weight | Name | Usage |
|--------|------|-------|
| 400 | Regular | Body text, descriptions |
| 500 | Medium | Emphasis, subheads |
| 600 | Semibold | Section titles, buttons |
| 700 | Bold | Page titles, headlines |

### Type Scale (with Tailwind classes)

| Element | Size | Line Height | Weight | Class |
|---------|------|-------------|--------|-------|
| H1 (Hero) | 48-60px | 1.1 | 600-700 | `text-4xl md:text-6xl font-semibold leading-[1.1]` |
| H1 (Page) | 30-36px | 1.2 | 600 | `text-3xl font-semibold tracking-tight` |
| H2 | 24px | 1.3 | 600 | `text-2xl font-semibold` |
| H3 | 20px | 1.4 | 600 | `text-xl font-semibold` |
| H4 | 16px | 1.5 | 600 | `text-base font-semibold` |
| Body Large | 18-20px | 1.6 | 400 | `text-lg leading-relaxed` |
| Body | 14-16px | 1.6 | 400 | `text-sm` or `text-base` |
| Caption | 12px | 1.4 | 500 | `text-xs font-medium` |

### Text Color Classes

```html
<!-- Primary text -->
<h1 class="text-text-main">Heading</h1>

<!-- Secondary text -->
<p class="text-text-muted">Description text</p>

<!-- Links -->
<a class="text-primary hover:text-primary-hover">Link</a>

<!-- Dark mode aware -->
<h1 class="text-text-main dark:text-white">Heading</h1>
<p class="text-text-muted dark:text-stone-400">Description</p>
```

---

## Spacing & Layout

### Container Widths

| Type | Max Width | Usage |
|------|-----------|-------|
| Content | `960px` | Centered content areas |
| Wide | `1200px` | Dashboard, data tables |
| Full | `1400px` | Marketing hero sections |

### Standard Padding

```html
<!-- Page sections -->
<section class="px-6 md:px-10 lg:px-40">

<!-- Cards -->
<div class="p-6">

<!-- Compact cards -->
<div class="p-4">
```

### Gap Standards

| Size | Value | Usage |
|------|-------|-------|
| xs | `4px` (`gap-1`) | Inline elements, icon+text |
| sm | `8px` (`gap-2`) | Related items |
| md | `12px` (`gap-3`) | Form fields |
| lg | `16px` (`gap-4`) | Section items |
| xl | `24px` (`gap-6`) | Section spacing |
| 2xl | `32px` (`gap-8`) | Major sections |

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `rounded` | 4px | Buttons, inputs, small cards |
| `rounded-sm` | 2px | Subtle rounding |
| `rounded-lg` | 6px | Standard cards |
| `rounded-xl` | 8px | Large cards, modals |
| `rounded-2xl` | 12px | Feature cards |
| `rounded-full` | 9999px | Pills, avatars, circular buttons |

---

## Shadows

### Shadow Classes

```html
<!-- Default card shadow -->
<div class="shadow-warm">Card content</div>

<!-- Elevated elements (hover state, dropdowns) -->
<div class="shadow-warm-lg">Elevated content</div>

<!-- Highly elevated (modals) -->
<div class="shadow-warm-xl">Modal content</div>
```

### Hover Lift Effect

```html
<div class="shadow-warm hover:shadow-warm-lg hover:-translate-y-1 transition-all duration-300">
  Interactive card
</div>
```

---

## Icons

### Primary Icon Set: Material Symbols Outlined

```html
<!-- Import -->
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">

<!-- Usage -->
<span class="material-symbols-outlined">dashboard</span>
<span class="material-symbols-outlined">bar_chart</span>
<span class="material-symbols-outlined">settings</span>
```

### Icon Sizes

| Size | Class | Usage |
|------|-------|-------|
| Small | `text-[16px]` | Inline with text |
| Default | `text-[20px]` | Navigation, buttons |
| Large | `text-[24px]` | Feature icons |
| XL | `text-2xl` | Feature cards |

### Filled Icon Variant

```html
<span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">
  dashboard
</span>
```

### Common Icons

| Icon Name | Usage |
|-----------|-------|
| `bar_chart` | Analytics, logo |
| `dashboard` | Dashboard nav |
| `schedule` | Realtime |
| `description` | Reports, docs |
| `settings` | Settings |
| `key` | Authentication |
| `call_merge` | Pull request |
| `monitoring` | Insights |
| `trending_up` | Positive change |
| `trending_down` | Negative change |
| `check` | Success, included feature |
| `close` | Excluded feature |
| `expand_more` | Dropdown |
| `chevron_right` | Navigation |
| `refresh` | Reload |
| `calendar_today` | Date picker |

---

## Component Patterns

### Card

```html
<div class="rounded-lg border border-border-color bg-surface-light p-6 shadow-warm dark:border-stone-700 dark:bg-surface-dark">
  Card content
</div>
```

### Interactive Card (with hover)

```html
<div class="group rounded-lg border border-border-color bg-surface-light p-6 shadow-warm transition-all duration-300 hover:-translate-y-1 hover:shadow-warm-lg dark:border-stone-700 dark:bg-surface-dark">
  <div class="transition-transform group-hover:scale-110">
    Icon or highlight element
  </div>
  Card content
</div>
```

### Primary Button

```html
<button class="flex h-10 items-center justify-center gap-2 rounded bg-primary px-6 text-sm font-medium text-white shadow-sm transition-all hover:bg-primary-hover hover:scale-[0.98]">
  <span class="material-symbols-outlined text-[18px]">add_circle</span>
  Button Text
</button>
```

### Secondary Button

```html
<button class="flex h-10 items-center justify-center gap-2 rounded border border-border-color bg-surface-light px-6 text-sm font-medium text-text-main shadow-warm transition-all hover:bg-stone-50 hover:scale-[0.98] dark:border-stone-600 dark:bg-surface-dark dark:text-white dark:hover:bg-stone-700">
  Button Text
</button>
```

### Ghost Button

```html
<button class="flex h-9 items-center justify-center gap-2 rounded px-4 text-sm font-medium text-text-muted transition-colors hover:bg-stone-100 hover:text-text-main dark:hover:bg-stone-800 dark:hover:text-white">
  Button Text
</button>
```

### Input Field

```html
<input
  type="text"
  class="h-10 w-full rounded border border-border-color bg-surface-light px-3 text-sm text-text-main placeholder:text-text-subtle shadow-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary dark:border-stone-600 dark:bg-surface-dark dark:text-white"
  placeholder="Placeholder text"
/>
```

### Select Dropdown

```html
<select class="h-10 rounded border border-border-color bg-surface-light px-3 pr-8 text-sm text-text-main shadow-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary dark:border-stone-600 dark:bg-surface-dark dark:text-white">
  <option>Option 1</option>
  <option>Option 2</option>
</select>
```

### Navigation Item (Active)

```html
<a class="flex items-center gap-3 rounded px-3 py-2 bg-primary/10 text-primary">
  <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">dashboard</span>
  <span class="text-sm font-medium">Dashboard</span>
</a>
```

### Navigation Item (Inactive)

```html
<a class="flex items-center gap-3 rounded px-3 py-2 text-text-muted transition-colors hover:bg-stone-100 hover:text-text-main dark:hover:bg-surface-dark dark:hover:text-white cursor-pointer">
  <span class="material-symbols-outlined">settings</span>
  <span class="text-sm font-medium">Settings</span>
</a>
```

### Stat Card

```html
<div class="rounded-lg border border-border-color bg-surface-light p-6 shadow-warm dark:border-stone-700 dark:bg-surface-dark">
  <p class="text-sm font-medium text-text-muted">Total Visitors</p>
  <p class="mt-2 text-3xl font-bold text-text-main dark:text-white">12.5k</p>
  <span class="mt-2 flex items-center gap-1 text-sm font-medium text-primary">
    <span class="material-symbols-outlined text-[16px]">trending_up</span>
    +12%
  </span>
</div>
```

### Badge / Pill

```html
<!-- Primary/Success -->
<span class="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
  <span class="h-1.5 w-1.5 rounded-full bg-primary animate-pulse"></span>
  Live
</span>

<!-- Warning -->
<span class="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-600">
  Pending
</span>

<!-- Neutral -->
<span class="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-text-muted dark:bg-stone-800">
  Inactive
</span>
```

### Table

```html
<div class="overflow-hidden rounded-lg border border-border-color bg-surface-light shadow-warm dark:border-stone-700 dark:bg-surface-dark">
  <div class="border-b border-border-color bg-stone-50/50 p-4 dark:bg-stone-800/50">
    <h4 class="text-sm font-bold text-text-main dark:text-white">Table Title</h4>
  </div>
  <div class="overflow-x-auto">
    <table class="w-full border-collapse text-left">
      <thead>
        <tr class="border-b border-border-color text-xs text-text-muted">
          <th class="p-4 font-medium">Column 1</th>
          <th class="p-4 font-medium text-right">Column 2</th>
        </tr>
      </thead>
      <tbody class="text-sm">
        <tr class="border-b border-stone-50 transition-colors hover:bg-stone-50/50 dark:border-stone-800 dark:hover:bg-stone-800/50">
          <td class="p-4 font-medium text-text-main dark:text-white">Value 1</td>
          <td class="p-4 text-right text-text-muted">Value 2</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
```

### Progress Bar

```html
<div class="h-1.5 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-700">
  <div class="h-full rounded-full bg-primary" style="width: 65%"></div>
</div>
```

---

## Page Layouts

### Marketing Page Layout

```html
<div class="min-h-screen bg-background-light font-display text-text-main dark:bg-background-dark dark:text-white">
  <!-- Sticky Header -->
  <header class="sticky top-0 z-40 w-full border-b border-border-color bg-background-light/80 backdrop-blur-md dark:border-stone-800 dark:bg-background-dark/80">
    <div class="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-6 md:px-10 lg:px-40">
      <!-- Logo + Nav + CTAs -->
    </div>
  </header>

  <main>
    <!-- Sections -->
  </main>

  <footer class="border-t border-border-color bg-surface-light py-12 px-6 dark:border-stone-800 dark:bg-surface-dark">
    <!-- Footer content -->
  </footer>
</div>
```

### Dashboard Layout

```html
<div class="flex h-screen overflow-hidden bg-background-light font-display text-text-main dark:bg-background-dark dark:text-white">
  <!-- Sidebar -->
  <aside class="flex h-full w-64 shrink-0 flex-col justify-between border-r border-border-color bg-background-light dark:border-stone-800 dark:bg-background-dark">
    <!-- Logo, Nav, Footer -->
  </aside>

  <!-- Main Content -->
  <main class="relative flex h-full flex-1 flex-col overflow-hidden">
    <!-- Header -->
    <header class="flex h-16 shrink-0 items-center justify-between border-b border-transparent px-8">
      <!-- Breadcrumb, Actions -->
    </header>

    <!-- Scrollable Content -->
    <div class="flex-1 overflow-y-auto p-6 md:p-8">
      <!-- Page content -->
    </div>
  </main>
</div>
```

---

## Animation & Transitions

### Standard Transitions

```html
<!-- Color transitions -->
<element class="transition-colors">

<!-- All properties -->
<element class="transition-all duration-300">

<!-- Transform only -->
<element class="transition-transform">
```

### Hover Effects

```html
<!-- Lift effect -->
<div class="hover:-translate-y-1 transition-all duration-300">

<!-- Scale down (button press) -->
<button class="hover:scale-[0.98] transition-all">

<!-- Icon scale -->
<div class="group-hover:scale-110 transition-transform">
```

### Pulse Animation (Live indicator)

```html
<span class="h-2 w-2 rounded-full bg-primary animate-pulse"></span>
```

---

## Dark Mode

### Strategy

Use Tailwind's `dark:` modifier for all color-sensitive classes.

### Key Dark Mode Mappings

| Light | Dark | Element |
|-------|------|---------|
| `bg-background-light` | `dark:bg-background-dark` | Page background |
| `bg-surface-light` | `dark:bg-surface-dark` | Cards |
| `text-text-main` | `dark:text-white` | Headings |
| `text-text-muted` | `dark:text-stone-400` | Descriptions |
| `border-border-color` | `dark:border-stone-700` | Borders |
| `hover:bg-stone-50` | `dark:hover:bg-stone-800` | Hover states |

### Dark Mode Toggle

The dark mode should be toggled by adding/removing the `dark` class on the `<html>` element:

```javascript
document.documentElement.classList.toggle('dark');
```

---

## Conversion Checklist

When converting a component or page to this design system:

### Colors
- [ ] Replace all `slate-*` colors with equivalent `stone-*` or semantic tokens
- [ ] Replace any custom orange/amber primaries with `primary` (teal)
- [ ] Update background from `white` to `bg-background-light`
- [ ] Update text colors to `text-text-main` / `text-text-muted`
- [ ] Update border colors to `border-border-color`

### Typography
- [ ] Ensure Inter font is loaded
- [ ] Use appropriate weight classes (400, 500, 600, 700)
- [ ] Apply `tracking-tight` to headlines

### Shadows
- [ ] Replace `shadow-sm` with `shadow-warm`
- [ ] Replace `shadow-md`/`shadow-lg` with `shadow-warm-lg`

### Border Radius
- [ ] Use design system radius values (4px default, 6px cards)
- [ ] Update `rounded-md` to `rounded` or `rounded-lg`

### Icons
- [ ] Replace inline SVGs with Material Symbols where appropriate
- [ ] Use consistent icon sizing

### Spacing
- [ ] Review and standardize padding/margins
- [ ] Use consistent gap values

### Dark Mode
- [ ] Add `dark:` variants for all color classes
- [ ] Test appearance in both modes

---

## Quick Reference: Class Migration

| Old Class | New Class |
|-----------|-----------|
| `bg-white` | `bg-surface-light dark:bg-surface-dark` |
| `bg-slate-50` | `bg-background-light dark:bg-background-dark` |
| `text-slate-900` | `text-text-main dark:text-white` |
| `text-slate-600` | `text-text-muted dark:text-stone-400` |
| `text-slate-500` | `text-text-subtle dark:text-stone-500` |
| `border-slate-200` | `border-border-color dark:border-stone-700` |
| `border-slate-300` | `border-border-strong dark:border-stone-600` |
| `hover:bg-slate-50` | `hover:bg-stone-50 dark:hover:bg-stone-800` |
| `bg-slate-100` | `bg-stone-100 dark:bg-stone-800` |
| `bg-slate-900` (button) | `bg-text-main dark:bg-white dark:text-text-main` |
| `shadow-sm` | `shadow-warm` |
| `rounded-md` | `rounded` or `rounded-lg` |
| `#ec7f13` (orange) | `primary` (#14b8a6 teal) |

---

## File Structure

```
apps/web/
├── app/
│   ├── globals.css           # Update with design system base styles
│   └── ...
├── components/
│   ├── ui/                   # Create shared UI components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── badge.tsx
│   │   └── ...
│   ├── dashboard/            # Dashboard-specific components
│   └── marketing/            # Marketing-specific components
└── tailwind.config.js        # Updated with design system tokens
```

---

## globals.css Updates

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html,
  body {
    height: 100%;
  }

  body {
    @apply bg-background-light text-text-main font-display antialiased;
    @apply dark:bg-background-dark dark:text-white;
    font-feature-settings: "cv11", "ss01";
  }

  /* Selection highlighting */
  ::selection {
    @apply bg-primary/20 text-primary-dark;
  }

  /* Custom scrollbar */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: transparent;
  }

  ::-webkit-scrollbar-thumb {
    @apply bg-border-color rounded;
  }

  ::-webkit-scrollbar-thumb:hover {
    @apply bg-border-strong;
  }
}

@layer components {
  /* Reusable component classes can be added here */
}
```

---

*Last updated: December 2024*
*Version: 2.0*
