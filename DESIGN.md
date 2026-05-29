# Design

## Theme

Dark. SRE operator glancing at competitor changes on a 27-inch monitor at 2am in a dim room. The interface should feel like a tool that works, not a brochure that sells.

## Color Strategy

Committed. One saturated color (violet) carries 30-40% of the surface weight. Not restrained — this brand has a POV.

### Palette (OKLCH)

- **Background**: `oklch(0.13 0.005 270)` — near-black with blue tint, never pure #000
- **Surface**: `oklch(0.16 0.005 270)` — slightly lifted for cards/sections
- **Surface raised**: `oklch(0.20 0.008 270)` — interactive elements, hover states
- **Border**: `oklch(0.22 0.008 270)` — subtle separation, never harsh
- **Text primary**: `oklch(0.95 0.005 270)` — near-white, never pure #fff
- **Text secondary**: `oklch(0.55 0.01 270)` — labels, metadata
- **Brand**: `oklch(0.55 0.22 290)` — violet-600 equivalent, the primary accent
- **Brand hover**: `oklch(0.60 0.24 290)` — lighter on interaction
- **Danger**: `oklch(0.60 0.22 25)` — red for alerts/threats, used sparingly
- **Success**: `oklch(0.70 0.18 155)` — green for positive signals

### Color Rules

- Violet appears in: header logo, primary CTAs, active nav states, alert severity badges. Never as background fills on large surfaces.
- Red appears only in: alert cards, threat indicators, the "critical" badge. Never decorative.
- No gradient text anywhere. Ever.
- No radial gradient blobs in backgrounds.

## Typography

**Font**: Geist Sans (already installed via next/font). Commit to it.

- **Display**: 800 weight, tight tracking (-0.03em), line-height 1.0
- **Heading**: 700 weight, tracking -0.02em, line-height 1.2
- **Body**: 400 weight, line-height 1.6
- **Mono**: Geist Mono for data, code, technical callouts
- **Scale**: Fluid clamp(), ratio 1.33 (perfect fourth)

### Type Scale

| Role | Size | Weight |
|------|------|--------|
| Display | clamp(2.5rem, 5vw, 4.5rem) | 800 |
| H2 | clamp(1.5rem, 3vw, 2.25rem) | 700 |
| H3 | 1.25rem | 700 |
| Body | 1rem | 400 |
| Small | 0.875rem | 400 |
| Caption | 0.75rem | 500 |

## Layout

- Left-aligned hero, never centered
- Asymmetric grid compositions
- Generous vertical spacing between sections (clamp 4rem 8rem)
- Max-width 1200px content area
- No container wrapping everything — let sections breathe

## Components

### Cards
- No rounded-2xl or rounded-3xl. Use rounded-lg (8px) or rounded-xl (12px) max.
- 1px borders using theme border color. No shadows.
- Background: theme surface color.

### Buttons
- Primary: solid violet bg, white text, no gradient, no shadow.
- Secondary: transparent bg, 1px border, text primary color.
- No pill-shaped buttons. Use rounded-lg.

### Mock Dashboard
- Feels like a real app chrome, not a "mockup"
- Browser dots (red/yellow/green) are acceptable
- Content inside should look like real data, not placeholder text

## Motion

- No entrance animations on page load
- Hover transitions: 150ms ease-out on interactive elements
- No bouncing, no elastic, no spring physics
- prefers-reduced-motion: disable all transitions

## Bans (on top of shared bans)

- No gradient text
- No gradient blobs in background
- No card grids with identical icon+title+text pattern
- No "Trusted by X teams" social proof bars
- No floating/pulsing decorative elements
- No rounded-full on buttons or large elements
