# Stay Distance — Brand guide

## Concept

**Isochrone.** A map pin surrounded by concentric rounded rings, suggesting
travel-time isochrones (how-far-is-this-stay at a glance). Communicates the
extension's function directly and sits naturally alongside OpenStreetMap tooling.

## Wordmark

- Primary: **Stay Distance** (title case).
- Font: Inter 600, tracking `-0.01em`.
- Repo/package name remains `stay-distance` (lowercase, hyphenated).

## Palette

### Light

| Token         | Hex       | Use                               |
| ------------- | --------- | --------------------------------- |
| `primary`     | `#2E7D4F` | brand, pin body, active controls  |
| `accent`      | `#F2A541` | nearest-ring highlight, fast-tier |
| `foreground`  | `#1C2B2D` | primary text                      |
| `muted-fg`    | `#6B7A7C` | secondary text, borders           |
| `background`  | `#FAFAF7` | page surface                      |
| `card`        | `#FFFFFF` | cards, side-panel surface         |
| `border`      | `#E6E4DC` | dividers                          |
| `destructive` | `#B3392F` | errors                            |

### Dark

| Token         | Hex       |
| ------------- | --------- |
| `primary`     | `#4CAF7A` |
| `accent`      | `#F2B860` |
| `foreground`  | `#EAF1EE` |
| `muted-fg`    | `#8FA0A2` |
| `background`  | `#121815` |
| `card`        | `#1A221F` |
| `border`      | `#2A332F` |
| `destructive` | `#E06A60` |

Both schemes are driven by `prefers-color-scheme`, with a manual `.dark` class
override hook available on `:root` for a future in-app theme toggle.

## Typography

- UI: **Inter** (400/500/600) self-hosted via `@fontsource/inter` — no CDN calls,
  consistent with the privacy-first posture.
- Mono: `ui-monospace, SFMono-Regular, Menlo, Consolas` for durations and distances.

## Icon spec

Master SVG viewBox `128×128` — see `public/icons/icon.svg` (light) and
`icon-dark.svg` (dark).

- **Pin.** Teardrop path, body `#2E7D4F`, inner dot off-white.
- **Rings.** Outer `#F2A541` @ 70% opacity, inner `#6B7A7C` @ 50% opacity.
- **Safe margin.** 10px padding inside the 128 viewBox so Chrome's rounded
  toolbar square doesn't clip the outer ring.
- **16px variant** (`icon-16.svg` / `icon-16-dark.svg`): drops the warm outer
  ring and keeps pin + one muted ring, with thicker strokes for pixel-grid
  crispness.

### Regenerating the PNGs

```bash
pnpm tsx scripts/build-icons.ts
```

Rasterises `{icon,icon-dark,icon-16,icon-16-dark}.svg` into 16/32/48/128 PNGs
under `public/icons/`. The 16px outputs use the simplified SVG; all other
sizes use the full master.

## Do / don't

- ✅ Pair the pin with either ring (or both) — never float the pin alone.
- ✅ Keep `#F2A541` for highlights and the outer ring only; never use it as the
  pin body.
- ❌ Don't stretch or rotate the mark.
- ❌ Don't recolour the pin — it must stay in the brand greens.
- ❌ Don't use the full-saturation brand green inside booking.com's own chrome
  (it reads too close to booking.com's blue/green mix). Use the overlay chip
  spec below instead.

## Content-script chip (booking.com overlay)

The extension's inline badges on booking.com pages deliberately step back from
the brand palette so they stay visually distinct from booking.com's own UI:

- Normal tier: `bg-[var(--ink)]` (`#1C2B2D`), text `var(--ink-fg)` (`#FAFAF7`),
  border `rgba(28,43,45,0.15)`.
- Fast tier: `bg-[var(--brand)]` (`#2E7D4F`), white text — reserved for short
  travel times only (see `InlineBadge` thresholds).
- Slow tier: `bg-[var(--muted)]` — muted, low-contrast signal.

The mode icon uses an emoji glyph (🚗 🚴 🚶) for instant mode recognition; the
time/distance uses a monospace stack.

## Files

- Master icons: `public/icons/icon.svg`, `icon-dark.svg`, `icon-16.svg`,
  `icon-16-dark.svg`.
- Raster PNGs: `public/icons/icon-{16,32,48,128}{,-dark}.png`.
- Logo React component: `src/components/brand/Logo.tsx`.
- Theme tokens: `src/styles/theme.css`.
- Shadow-DOM theme subset: `src/styles/shadow.css`.
