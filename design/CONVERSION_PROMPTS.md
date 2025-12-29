# Design System Conversion Prompts

This document contains detailed prompts for converting each page and component in the Tally Analytics app to the new design system defined in `NEW_DESIGN_SYSTEM.md`.

Use these prompts with Claude Code or any AI coding assistant to systematically convert the codebase.

---

## Pre-Conversion Setup

Before running any conversion prompts, first update the foundational files:

### Prompt 0: Update Tailwind Config

```
Update the file `apps/web/tailwind.config.js` to match the design system in `design/NEW_DESIGN_SYSTEM.md`.

The config should include:
- All semantic color tokens (primary, background-light, surface-light, text-main, text-muted, border-color, etc.)
- Custom font family for 'display' using Inter
- Custom border radius values (4px default, 2px sm, 6px lg, 8px xl)
- Custom warm shadow values (shadow-warm, shadow-warm-lg, shadow-warm-xl)
- Dark mode set to "class"

Preserve any existing content paths.
```

### Prompt 0.1: Update globals.css

```
Update `apps/web/app/globals.css` to match the base styles in `design/NEW_DESIGN_SYSTEM.md`.

Add:
1. Base body styles using the new design tokens (bg-background-light, text-text-main, font-display, antialiased)
2. Dark mode base styles
3. Custom scrollbar styling using design system colors
4. Selection highlighting with primary color
5. Font feature settings for Inter

Keep the existing Tailwind directives.
```

---

## Marketing Pages

### Prompt 1: Convert Marketing Layout

```
Convert the file `apps/web/app/(marketing)/layout.tsx` to use the new design system from `design/NEW_DESIGN_SYSTEM.md`.

Requirements:
1. The layout wrapper should have `bg-background-light dark:bg-background-dark` 
2. Add the font-display class
3. Ensure proper text colors with dark mode support
4. Include the Inter font import if not already present

Reference the "Marketing Page Layout" section in the design system.
```

### Prompt 2: Convert Navbar Component

```
Convert `apps/web/components/marketing/navbar.tsx` to the new design system.

Changes needed:
1. Header should be sticky with `bg-background-light/80 backdrop-blur-md` and `border-b border-border-color`
2. Logo icon should use `bg-primary/10 text-primary` with rounded corners
3. Logo text should use the serif font: `font-serif font-bold text-text-main`
4. Nav links: `text-sm font-medium text-text-muted hover:text-primary transition-colors`
5. Login button: secondary style with `border border-border-color bg-surface-light text-text-main hover:bg-stone-50`
6. Get Started button: primary style with `bg-primary text-white hover:bg-primary-hover`
7. Add dark mode variants to all color classes
8. Use Material Symbols for the logo icon: `<span class="material-symbols-outlined">bar_chart</span>`

Reference the header in `design/html/01-landing-page.html` for exact structure.
```

### Prompt 3: Convert Hero Component

```
Convert `apps/web/components/marketing/hero.tsx` to the new design system.

Current issues to fix:
1. Replace orange (#ec7f13) with teal primary color (#14b8a6)
2. Replace all hardcoded hex colors with design system tokens

Specific changes:
1. Version badge: `bg-accent-bg border border-primary/20 text-primary-dark` with animated pulse dot
2. Headline: `text-text-main dark:text-white` with the word "Next.js" in `text-primary font-serif italic`
3. Subhead: `text-text-muted dark:text-stone-400`
4. Primary CTA: `bg-primary text-white hover:bg-primary-hover shadow-warm` with icon
5. Secondary CTA: `border border-border-color bg-surface-light text-text-main hover:bg-stone-50 shadow-sm`
6. Dashboard preview card: `rounded-lg border border-border-color bg-surface-light shadow-warm-lg` with browser chrome dots
7. Add the gradient glow effect behind the preview card

Reference `design/html/01-landing-page.html` Hero Section for exact implementation.
```

### Prompt 4: Convert Features Component

```
Convert `apps/web/components/marketing/features.tsx` to the new design system.

Changes:
1. Section background: `bg-accent-bg-warm/60 dark:bg-stone-800/40` (warm tan)
2. Section header text: `text-text-main dark:text-white` for title, `text-text-muted dark:text-stone-400` for description
3. Feature cards:
   - Container: `rounded-lg border border-border-color bg-surface-light p-8 shadow-warm hover:shadow-warm-lg hover:-translate-y-1 transition-all duration-300`
   - Icon container: `size-12 rounded bg-primary/10 text-primary group-hover:scale-110 transition-transform`
   - Title: `text-xl font-semibold text-text-main dark:text-white`
   - Description: `text-text-muted dark:text-stone-400 leading-relaxed`
4. Replace inline SVG icons with Material Symbols:
   - Zero Configuration: `auto_fix_high` or `magic_button`
   - GDPR Compliant: `security` or `shield`
   - Ultra Lightweight: `speed` or `bolt`
5. Add dark mode support

Reference the Features section in `design/html/01-landing-page.html`.
```

### Prompt 5: Convert How It Works Component

```
Convert `apps/web/components/marketing/how-it-works.tsx` to the new design system.

Structure (3-step process):
1. Section: `py-24 px-6 md:px-10 lg:px-40 bg-background-light`
2. Header row with title and "View technical docs" link
3. Connecting dashed line between steps (desktop only)
4. Three step cards in a grid

Each step card:
- Circle container: `w-24 h-24 rounded-full bg-surface-light border-4 border-accent-bg shadow-sm`
- Step number badge: `absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary text-white font-bold text-sm`
- Icon: `material-symbols-outlined text-4xl text-text-muted`
- Title: `text-lg font-semibold text-text-main`
- Description: `text-sm text-text-muted`

Steps:
1. "Connect Repository" - icon: `key`
2. "Merge the PR" - icon: `call_merge`
3. "See Insights" - icon: `monitoring`

Reference `design/html/01-landing-page.html` How It Works section.
```

### Prompt 6: Convert Set and Forget Component

```
Convert `apps/web/components/marketing/set-and-forget.tsx` to the new design system.

If this component doesn't exist or needs creation, base it on the testimonial/quote section in the design:

Structure:
1. Section: `py-20 px-6 border-y border-border-color bg-stone-50`
2. Quote icon: `material-symbols-outlined text-4xl text-primary/40`
3. Blockquote: `text-2xl md:text-3xl font-serif font-medium text-text-main leading-relaxed`
4. Author info with avatar, name, and title

Colors and styling per design system. Add dark mode support.
```

### Prompt 7: Convert Footer Component

```
Convert `apps/web/components/marketing/footer.tsx` to the new design system.

Structure:
1. Footer: `border-t border-border-color bg-surface-light py-12 px-6 md:px-10 lg:px-40 dark:border-stone-800 dark:bg-surface-dark`
2. Logo section: small icon with `bg-primary/20 text-primary`, brand name in `font-serif font-bold`, and copyright
3. Links: `text-sm text-text-muted hover:text-primary transition-colors`

Links to include: Privacy Policy, Terms of Service, Twitter, GitHub

Reference the footer in `design/html/01-landing-page.html`.
```

### Prompt 8: Convert Marketing Landing Page

```
Convert `apps/web/app/(marketing)/page.tsx` to use the new design system.

This page should compose the marketing components in order:
1. Hero
2. Features  
3. How It Works
4. Testimonial/Quote section
5. CTA Footer section

The CTA Footer section at the end should have:
- Headline: "Ready to respect your users?"
- Subtext about starting tracking
- Two buttons: primary "Start for free" and ghost "Contact Sales"

Ensure all components use the updated design system tokens.
```

### Prompt 9: Convert Pricing Page

```
Convert `apps/web/app/(marketing)/pricing/page.tsx` and `apps/web/components/marketing/pricing-card.tsx` to the new design system.

Pricing Page structure:
1. Hero: centered heading and subhead
2. Three pricing cards in a grid
3. Compare plans table section

Pricing Card structure:
1. Card: `rounded-2xl border border-border-color bg-surface-light p-8 shadow-warm hover:shadow-warm-lg transition-all`
2. Pro/highlighted card: additional `ring-2 ring-primary` and `shadow-primary/15`
3. Plan name: `text-lg font-semibold text-text-main`
4. Price: `text-4xl font-bold text-text-main` with `/month` suffix in `text-text-muted`
5. CTA button: primary style for highlighted, secondary for others
6. Feature list with check icons using `material-symbols-outlined text-primary`
7. Disabled features use `text-stone-300` with `close` icon

Compare table:
- Container: `rounded-2xl border border-border-color bg-surface-light p-6`
- Table headers: `text-text-muted font-medium`
- Table cells: `text-text-main` or `text-text-muted` for labels

Reference `design/html/03-pricing-page.html`.
```

### Prompt 10: Convert Documentation Pages

```
Convert the documentation pages to the new design system:
- `apps/web/app/(marketing)/docs/page.tsx`
- `apps/web/app/(marketing)/docs/setup/page.tsx`  
- `apps/web/app/(marketing)/docs/sdk/page.tsx`

Common doc page structure:
1. Two-column layout with sidebar nav and content
2. Sidebar: `w-64 border-r border-border-color bg-background-light p-6`
3. Nav items: same pattern as dashboard nav (active/inactive states)
4. Content area: max-width prose styling

Code blocks:
- Container: `rounded-lg bg-surface-dark text-white p-4 overflow-x-auto`
- Syntax highlighting if available

Quick start cards (on docs landing):
- Card style with icon, title, description, and arrow link

Reference `design/html/05-docs-landing.html` and `design/html/06-docs-setup.html`.
```

### Prompt 11: Convert Legal Pages

```
Convert the legal pages to the new design system:
- `apps/web/app/(marketing)/privacy/page.tsx`
- `apps/web/app/(marketing)/terms/page.tsx`

Structure:
1. Page title: `text-3xl font-semibold text-text-main`
2. Last updated date: `text-sm text-text-muted`
3. Content sections with h2/h3 headings
4. Body text: `text-text-muted leading-relaxed`
5. Links: `text-primary hover:text-primary-hover`

Keep content unchanged, just update styling classes.
```

---

## Dashboard Pages

### Prompt 12: Convert Dashboard Layout

```
Convert `apps/web/app/(dashboard)/layout.tsx` to the new design system.

Structure:
1. Full-height flex container with sidebar + main content
2. Body classes: `bg-background-light text-text-main font-display antialiased dark:bg-background-dark dark:text-white`
3. Overflow hidden to enable scrolling in main content area only

Reference "Dashboard Layout" section in `design/NEW_DESIGN_SYSTEM.md`.
```

### Prompt 13: Convert Dashboard Sidebar

```
Convert `apps/web/components/dashboard/sidebar.tsx` to the new design system.

Sidebar structure:
1. Container: `w-64 bg-background-light dark:bg-background-dark border-r border-border-color dark:border-stone-800 h-full flex flex-col justify-between`
2. Top section with logo and navigation
3. Bottom section with plan/quota display

Logo:
- Icon: `size-8 rounded bg-primary flex items-center justify-center text-white`
- Use Material Symbol `bar_chart`
- Brand text: `text-lg font-bold text-text-main tracking-tight`

Navigation items:
- Active: `px-3 py-2 rounded bg-primary/10 text-primary flex items-center gap-3`
- Inactive: `px-3 py-2 rounded text-text-muted hover:bg-stone-100 dark:hover:bg-surface-dark hover:text-text-main flex items-center gap-3 cursor-pointer transition-colors`
- Use Material Symbols icons with filled variant for active state

Nav items: Dashboard, Realtime, Reports, Settings

Reference `design/html/02-dashboard-overview.html` sidebar.
```

### Prompt 14: Convert Dashboard Header

```
Convert `apps/web/components/dashboard/header.tsx` to the new design system.

Header structure:
1. Container: `h-16 px-8 flex items-center justify-between border-b border-transparent`
2. Left side: breadcrumb with project name and live status badge
3. Right side: action buttons (Refresh, Date picker)

Breadcrumb:
- Path: `text-text-muted text-sm` with `/` separator
- Project name: `text-base font-bold text-text-main`
- Live badge: animated pulse dot + "Live" text in primary color

Action buttons:
- Style: `h-9 px-3 rounded border border-border-color bg-surface-light text-text-main text-sm font-medium hover:bg-stone-50 shadow-warm`
- Icons: Material Symbols `refresh`, `calendar_today`

Reference `design/html/02-dashboard-overview.html` header section.
```

### Prompt 15: Convert Stat Card Component

```
Convert `apps/web/components/dashboard/stat-card.tsx` to the new design system.

Structure:
1. Container: `rounded-lg border border-border-color bg-surface-light p-6 shadow-warm dark:border-stone-700 dark:bg-surface-dark`
2. Label: `text-sm font-medium text-text-muted`
3. Value: `text-3xl font-bold text-text-main dark:text-white mt-1`
4. Change indicator: 
   - Positive: `text-primary flex items-center gap-1` with `trending_up` icon
   - Negative: `text-red-500 flex items-center gap-1` with `trending_down` icon
   - Neutral: `text-text-muted`

Reference the stat cards in `design/html/02-dashboard-overview.html`.
```

### Prompt 16: Convert Charts Components

```
Convert the chart components to the new design system:
- `apps/web/components/dashboard/page-views-chart.tsx`
- `apps/web/components/dashboard/sessions-chart.tsx`

Chart container:
1. Wrapper: `rounded-lg border border-border-color bg-surface-light p-6 shadow-warm dark:border-stone-700 dark:bg-surface-dark`
2. Header with title and period toggle buttons
3. Chart area

Chart styling:
- Use the design system gradient for area charts:
  ```
  <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
    <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.2"/>
    <stop offset="100%" stopColor="#14b8a6" stopOpacity="0"/>
  </linearGradient>
  ```
- Line stroke: `#14b8a6` (primary), strokeWidth 3
- Grid lines: `#e7e5e4` (border-color), dashed
- Axis labels: `text-xs text-text-muted font-medium`

Period toggle:
- Active: `px-2 py-1 rounded bg-stone-100 dark:bg-stone-800 text-xs font-medium text-text-muted`
- Inactive: `px-2 py-1 rounded text-xs font-medium text-text-muted hover:bg-stone-50 dark:hover:bg-stone-800`

Reference the chart in `design/html/02-dashboard-overview.html`.
```

### Prompt 17: Convert Top List Component

```
Convert `apps/web/components/dashboard/top-list.tsx` to the new design system.

Structure (table-based):
1. Container: `rounded-lg border border-border-color bg-surface-light shadow-warm overflow-hidden dark:border-stone-700 dark:bg-surface-dark`
2. Header: `p-4 border-b border-border-color bg-stone-50/50 dark:bg-stone-800/50` with title and "View All" link
3. Table with headers and rows

Table styling:
- Headers: `text-text-muted text-xs font-medium p-4`
- Rows: `border-b border-stone-50 dark:border-stone-800 hover:bg-stone-50/50 dark:hover:bg-stone-800/50`
- Primary column: `text-text-main font-medium`
- Value columns: `text-text-muted` or `text-text-main font-semibold` for emphasis

For Top Sources, include progress bars:
- Container: `w-full bg-stone-100 dark:bg-stone-700 rounded-full h-1.5`
- Fill: `bg-primary h-full rounded-full` with width based on percentage

Reference the tables in `design/html/02-dashboard-overview.html`.
```

### Prompt 18: Convert Status Badge Component

```
Convert `apps/web/components/dashboard/status-badge.tsx` to the new design system.

Badge variants:
1. Live/Active: `inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary`
   - Include animated pulse dot: `h-1.5 w-1.5 rounded-full bg-primary animate-pulse`
2. Pending: `bg-amber-500/10 text-amber-600`
3. Inactive/Paused: `bg-stone-100 text-text-muted dark:bg-stone-800`
4. Error: `bg-red-500/10 text-red-600`

Reference badge patterns in `design/NEW_DESIGN_SYSTEM.md`.
```

### Prompt 19: Convert Live Event Component

```
Convert `apps/web/components/dashboard/live-event.tsx` to the new design system.

Structure for real-time event display:
1. Container: `rounded border border-border-color bg-surface-light p-3 shadow-warm`
2. Event type badge
3. Path/URL: `text-sm font-medium text-text-main truncate`
4. Timestamp: `text-xs text-text-muted`
5. Optional metadata (country, device, etc.)

Add entrance animation for new events.
```

### Prompt 20: Convert Project Card Component

```
Convert `apps/web/components/dashboard/project-card.tsx` to the new design system.

Structure:
1. Card: `group rounded-lg border border-border-color bg-surface-light p-6 shadow-warm hover:shadow-warm-lg hover:-translate-y-0.5 transition-all duration-200`
2. Project name: `text-lg font-semibold text-text-main group-hover:text-primary`
3. Repository link: `text-sm text-text-muted`
4. Status badge (Live, Pending, etc.)
5. Stats row: page views, sessions, etc.
6. Last updated timestamp

Add link wrapping for navigation to project detail.
```

### Prompt 21: Convert Quota Display Component

```
Convert `apps/web/components/dashboard/quota-display.tsx` to the new design system.

Structure (sidebar bottom section):
1. Container: `p-6 border-t border-border-color`
2. Inner card: `bg-surface-light dark:bg-surface-dark p-4 rounded shadow-warm border border-border-color`
3. Plan name: `text-sm font-semibold text-text-main`
4. Usage text: `text-xs text-text-muted` (e.g., "12k / 50k events")
5. Progress bar: design system progress bar component
6. Upgrade button: `w-full py-2 bg-text-main text-white text-xs font-bold rounded hover:bg-stone-800`

Reference the sidebar footer in `design/html/02-dashboard-overview.html`.
```

### Prompt 22: Convert Skeleton Components

```
Convert `apps/web/components/dashboard/skeleton.tsx` to the new design system.

Skeleton base:
- Background: `bg-stone-100 dark:bg-stone-800 animate-pulse rounded`

Skeleton variants:
- SkeletonStatCard: matches stat card dimensions
- SkeletonChart: matches chart dimensions
- SkeletonList: matches top list dimensions
- SkeletonText: various heights for text placeholders

All skeletons should use design system border radius and have smooth pulse animation.
```

### Prompt 23: Convert Onboarding Checklist

```
Convert `apps/web/components/dashboard/onboarding-checklist.tsx` to the new design system.

Structure:
1. Card container with design system styling
2. Title: "Getting Started" or similar
3. Progress indicator showing completion
4. Checklist items with:
   - Completed state: `text-primary` with filled check icon
   - Pending state: `text-text-muted` with outline circle
   - Item text and description
5. Optional dismiss/close button

Use design system colors, borders, and shadows.
```

---

## App Pages

### Prompt 24: Convert Projects List Page

```
Convert `apps/web/app/(dashboard)/projects/page.tsx` to the new design system.

Page structure:
1. Header section with title "Projects" and "Create Project" button
2. Grid of project cards using the updated ProjectCard component
3. Empty state if no projects

Header:
- Title: `text-2xl font-semibold text-text-main tracking-tight`
- Create button: primary button style

Empty state:
- Container: centered with icon, message, and CTA
- Icon: `material-symbols-outlined text-4xl text-text-muted`
- Message: `text-text-muted`
```

### Prompt 25: Convert Project Detail Page

```
Convert `apps/web/app/(dashboard)/projects/[id]/page.tsx` and related pages:
- `overview/page.tsx`
- `live/page.tsx`
- `sessions/page.tsx`

All pages should use design system styling for:
1. Page headers with title and actions
2. Content grids and spacing
3. Card containers
4. Loading and error states

Update the project layout at `projects/[id]/layout.tsx` to include:
- Tab navigation between Overview, Live, Sessions
- Tab styling: active/inactive states matching nav item pattern
```

### Prompt 26: Convert Settings Page

```
Convert `apps/web/app/(dashboard)/settings/page.tsx` to the new design system.

Page structure:
1. Header: "Account settings" title and description
2. Account info card:
   - Container: design system card styling
   - Definition list with Email and Plan
   - Labels: `text-text-muted`
   - Values: `font-medium text-text-main`
3. Logout button: could be secondary/danger style

Add sections for:
- Profile settings
- Notification preferences
- Connected accounts (GitHub)
- Danger zone (delete account)
```

### Prompt 27: Convert Login Page

```
Convert `apps/web/app/login/page.tsx` to the new design system.

Page structure:
1. Centered container: `max-w-md mx-auto px-6 py-16`
2. Header with title and description
3. Form card:
   - Container: design system card styling
   - Email input: design system input styling
   - Submit button: primary button style
   - Status message area

Styling:
- Title: `text-3xl font-semibold tracking-tight text-text-main`
- Description: `text-sm text-text-muted`
- Input: full design system input component
- Button: full-width primary button
- Loading state: "Sending…" with disabled style
- Success state: green/primary tinted message
- Error state: red tinted message

Consider adding:
- Logo at top
- Link back to marketing site
- Social login options (GitHub)
```

---

## What You Get Component

### Prompt 28: Convert What You Get Component

```
Convert `apps/web/components/marketing/what-you-get.tsx` to the new design system.

This component showcases analytics features with visual examples.

Structure:
1. Section with alternating image/text layout
2. Feature cards with screenshots/illustrations
3. Use design system card styling
4. Teal accents for highlights

Ensure responsive layout and dark mode support.
```

---

## Final Steps

### Prompt 29: Create Shared UI Components

```
Create a set of shared UI components in `apps/web/components/ui/` that implement the design system:

1. `button.tsx` - Button component with variants (primary, secondary, ghost, danger)
2. `card.tsx` - Card component with optional hover effects
3. `input.tsx` - Input component with label and error states
4. `badge.tsx` - Badge component with status variants
5. `skeleton.tsx` - Skeleton component variants

Each component should:
- Accept appropriate props
- Support dark mode
- Be fully typed with TypeScript
- Export both named and default exports
- Include JSDoc comments

Reference the component patterns in `design/NEW_DESIGN_SYSTEM.md`.
```

### Prompt 30: Final Review and Cleanup

```
Perform a final review of the entire codebase for design system compliance:

1. Search for any remaining:
   - `slate-` color classes → replace with `stone-` or semantic tokens
   - `#ec7f13` or orange colors → replace with primary teal
   - `shadow-sm` → replace with `shadow-warm`
   - `rounded-md` without intentional use → review for design system radius

2. Verify all pages have dark mode support

3. Check icon consistency - replace remaining inline SVGs with Material Symbols where appropriate

4. Ensure font loading is configured in layout files

5. Test responsive behavior on mobile, tablet, desktop

6. Verify hover and focus states are consistent

Run the command to find potential issues:
```bash
grep -rn "slate-" apps/web/
grep -rn "#ec7f13" apps/web/
grep -rn "shadow-sm" apps/web/
```

Create a report of any remaining inconsistencies.
```

---

## Usage Notes

### Order of Execution

For best results, execute these prompts in order:

1. **Foundation** (Prompts 0, 0.1) - Update config files first
2. **Shared Components** (Prompt 29) - Create reusable components
3. **Layouts** (Prompts 1, 12) - Update page layouts
4. **Marketing Pages** (Prompts 2-11) - Convert marketing site
5. **Dashboard** (Prompts 13-23) - Convert dashboard components
6. **App Pages** (Prompts 24-27) - Convert remaining pages
7. **Final Review** (Prompt 30) - Cleanup and verification

### Tips for AI Assistants

- Always reference `design/NEW_DESIGN_SYSTEM.md` for exact color values and patterns
- Check the HTML mockups in `design/html/` for visual reference
- Preserve existing functionality while updating styling
- Add dark mode support even if original didn't have it
- Run the app after each conversion to verify no regressions

### Testing

After each conversion:
1. Visual check in light and dark modes
2. Responsive check at mobile/tablet/desktop
3. Interactive states (hover, focus, active)
4. Run existing tests: `npm test`
