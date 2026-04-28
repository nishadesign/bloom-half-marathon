# Bloom — Design & Responsive Rules

This is the source of truth for how the Bloom landing page (and any future page) should look and behave across devices. It's mobile-first and intentionally opinionated so decisions are fast.

## 1. Core principle

Design for a phone first, then let it breathe on larger screens. If something only works on desktop, it's not done.

## 2. Breakpoints

We use Tailwind's defaults. Target these three states explicitly:

| Name | Width | Typical device |
| --- | --- | --- |
| base | < 640px | phones (iPhone SE → Pro Max) |
| `sm:` | ≥ 640px | large phones, small tablets portrait |
| `md:` | ≥ 768px | tablets, small laptops |
| `lg:` | ≥ 1024px | laptops |
| `xl:` | ≥ 1280px | desktop |

Test at minimum: **375px, 414px, 768px, 1024px, 1440px**.

## 3. Layout

- Always wrap page sections in `max-w-content mx-auto` with responsive horizontal padding: `px-sm sm:px-md md:px-xl`. Never let content go edge-to-edge on phones; never let it sprawl past ~1120px on desktop.
- Use `grid` with stacked layout on base, columns from `md:` up. Default to `md:grid-cols-12` for flexible splits.
- Vertical rhythm: sections use `py-xl sm:py-2xl`. Never use `py-2xl` alone — it's too much air on mobile.
- Gaps scale: `gap-md sm:gap-lg md:gap-xl`.
- Never rely on fixed pixel widths for containers. Use `max-w-*` utilities and let content reflow.

## 4. Typography

Fluid, but explicit. Don't use Tailwind's `text-xl` family for display type — use bracket sizes so scale is clear.

| Role | Base | `sm:` | `md:` |
| --- | --- | --- | --- |
| Hero H1 | `text-[36px]` | `text-[44px]` | `text-[64px]` |
| Section H2 | `text-[28px]` | `text-[32px]` | `text-[40px]` |
| Block H3 | `text-[24px]` | `text-[28px]` | `text-[34px]` |
| Card title | `text-[20px]` | `text-[22px]` | — |
| Body | `text-[15px]` | `text-[17px]` | — |
| Small | `text-[13px]` | `text-[14px]` | — |

- Line-height stays tight on display (`leading-[1.02–1.15]`), generous on body (`1.7`).
- Always include `tracking-[-0.01em]` to `-0.02em` on display type.
- Body copy max width ≈ `max-w-md` (≈480px) for readability.

## 5. Buttons & touch targets

- Minimum tap target: **44×44px**. On mobile CTAs, prefer `w-full sm:w-auto` so the thumb has room.
- In the sticky nav, compress the CTA label on narrow screens (e.g. "Join" base, "Join waitlist" from `sm:` up).
- Keep primary/secondary button shapes consistent (`rounded-full`).

## 6. Images & media

- Always use a known `aspect-[x/y]` ratio and `object-cover` so images never cause layout shift.
- Use `rounded-[20px]` on mobile, `rounded-[24px]` from `sm:` up — big radii feel clunky at small sizes.
- Globally: `img, svg, video { max-width: 100%; height: auto; }` (set in `globals.css`).
- First hero image: `loading="eager"`. Everything else: `loading="lazy"`.

## 7. Navigation

- Sticky header with `backdrop-blur-md` and translucent background.
- Height: `h-14` on mobile, `h-16` from `sm:` up.
- Secondary nav links (`How it works`, `Features`, `FAQ`) hidden below `md:`. The page's section anchors + the waitlist CTA are the primary mobile navigation.
- If a true mobile menu is ever added, it must be keyboard-accessible and close on route/anchor change.

## 8. Forms

- Inputs at least 44px tall. Use `type="email"`, `type="tel"`, etc. so mobile keyboards are correct.
- On small screens, stack input + button (`flex-col sm:flex-row`). Button gets full width on base.
- Never rely on placeholder alone; keep a visually hidden `<label>` for screen readers.

## 9. Accessibility

- Color contrast meets WCAG AA against parchment/obsidian backgrounds.
- Every interactive element has a visible focus state (rely on Tailwind's default `focus:outline` or add `focus-visible` styles).
- `aria-expanded`, `aria-hidden`, `sr-only` labels where appropriate (see FAQ + Waitlist for patterns).
- Don't disable zoom. Viewport allows `maximumScale: 5`.

## 10. Color & tokens

Defined in `tailwind.config.ts` and `globals.css`:

- `obsidian` `#1C1C1C` — primary text, dark CTAs
- `graphite` `#4A4A4A` — secondary text
- `sand` `#C8B89A` — accent
- `linen` `#F0EBE3` — soft surface
- `parchment` `#FAFAF8` — page background

Spacing scale (custom): `xs 8` · `sm 16` · `md 24` · `lg 32` · `xl 48` · `2xl 64`.

## 11. Checklist before shipping a page

- [ ] Renders cleanly at 375px with no horizontal scroll.
- [ ] All CTAs are reachable without pinch-zoom.
- [ ] Images have explicit aspect ratios and alt text.
- [ ] Headings scale down on mobile (use bracket sizes from §4).
- [ ] Section padding uses `py-xl sm:py-2xl`, not raw `py-2xl`.
- [ ] Works with keyboard only (Tab through every interactive element).
- [ ] `<html lang>` set, viewport meta exported from `app/layout.tsx`.
