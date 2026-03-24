# Segelschule Altwarp — CI Design Rules

Enforced by `scripts/ci/check-segelschule-ci-design.sh`.
Run locally: `npm run segelschule:ci:guard`

## Color Palette

| Name | Hex | CSS Variable | Usage |
|------|-----|-------------|-------|
| Flaschengruen | `#1E3926` | `--primary` | Footer bg, dark sections, hero bottoms |
| Elfenbein | `#FFF6C3` | `--secondary` | Light section backgrounds |
| Background | `#FFFBEA` | `--background` | Body background ONLY |
| Feuerrot | `#DB2E26` | `--accent` | ALL primary CTA buttons |
| Dunkelrot | `#AA2023` | `--destructive` | CTA hover state |
| Sand | `#E2C786` | `--border` | Borders, stars, subtle accents |

## Rules

### `primary_opacity_bg`
**No Tailwind opacity variants on primary >= 30%.**
Use solid hex values instead.

- Blocked: `bg-primary/80`, `hover:bg-primary/90`, `from-primary/70`, `text-primary/70`
- Allowed: `bg-primary/5`, `bg-primary/10`, `bg-primary/20`, `border-primary/20`
- Fix: Replace `hover:bg-primary/90` with `hover:bg-[#2A4D36]` (a slightly lighter Flaschengruen)

### `washed_hero_gradient`
**No `bg-gradient-to-b from-primary` for heroes.**
This creates a washed-out green that misses the CI spec.

- Blocked: `bg-gradient-to-b from-primary to-primary/90`
- Fix: Use inline style `background: linear-gradient(to bottom, #FFFBEA 0%, #1E3926 30%)`

### `cta_uses_primary`
**CTA/shimmer buttons must use `bg-accent`, NOT `bg-primary`.**

- Blocked: `bg-primary ... shimmer-button` without `bg-accent`
- Fix: `bg-accent hover:bg-[#AA2023] text-accent-foreground shimmer-button`

### `prototype_cta_pattern`
**Prototype-era CTA pattern using `bg-primary hover:bg-primary/90`.**

- Blocked: `bg-primary hover:bg-primary/90` on submit/book/action buttons
- Fix: `bg-accent hover:bg-[#AA2023] text-accent-foreground shimmer-button`

### `section_bg_body_color`
**`#FFFBEA` is body background ONLY.** Section backgrounds must use `#FFF6C3` (Elfenbein).

- Blocked: `bg-[#FFFBEA]` as a standalone section/component background class
- Allowed: `bg-[#FFFBEA]/20` (subtle hover tints), `text-[#FFFBEA]` (text colors)
- Fix: Replace `bg-[#FFFBEA]` with `bg-secondary`

### `orange_opacity`
**No high-opacity variants on accent/orange colors (>= 50%).**
Feuerrot should be solid; hover goes to Dunkelrot.

- Blocked: `hover:bg-orange/90`, `bg-orange/50`
- Allowed: `bg-orange/10` (subtle tints for info boxes)
- Fix: Replace `hover:bg-orange/90` with `hover:bg-[#AA2023]`

## Exempt Files

These files are not checked (they define base variant systems):
- `components/ui/button.tsx`, `components/ui/badge.tsx`
- `components/ui/navigation-menu.tsx`, `components/ui/field.tsx`, `components/ui/item.tsx`
- `globals.css`, `tailwind.config.*`
- Everything in `prototype/`

## Hero Gradient Reference

Subpage heroes use `forceScrolledStyle` on the header (fully opaque cream bg + wave edge).
The gradient starts cream (matching the header) and eases through sage tones into Flaschengruen.

```tsx
<Header navLinks={t.nav} forceScrolledStyle />
<main className="pt-20">
  <section
    className="py-16 md:py-24 px-4"
    style={{ background: "linear-gradient(to bottom, #FFFBEA 0%, #C5D8B8 12%, #5A7A5C 28%, #2D5038 42%, #1E3926 58%)" }}
  >
    <h1 className="text-white font-serif font-bold">...</h1>
    <p className="text-white/90">...</p>
  </section>
```

- `#FFFBEA` at 0% — seamless with the opaque header (no bleed-through)
- `#C5D8B8` light sage at 12% — gentle first transition
- `#5A7A5C` mid-green at 28% — through the sage zone
- `#2D5038` deep green at 42% — approaching Flaschengruen
- `#1E3926` at 58% — settles to base for white text and WaveDivider
- Header must be fully opaque (`bg-background`, not `bg-background/95`)

## Section Alternation Reference

Sections alternate between Elfenbein and Flaschengruen with WaveDividers:
```
Elfenbein -> Flaschengruen: <WaveDivider fillColor="#1E3926" bgColor="#FFF6C3" />
Flaschengruen -> Elfenbein: <WaveDivider fillColor="#FFF6C3" bgColor="#1E3926" />
```

## Button Quick Reference

| Context | Classes |
|---------|---------|
| Primary CTA (book, submit, pay) | `bg-accent hover:bg-[#AA2023] text-accent-foreground shimmer-button` |
| Navigation (back, continue) | `bg-primary text-primary-foreground` (green is OK) |
| Carousel arrow hover | `hover:bg-[#2A4D36]` (solid lighter green, not primary/90) |
