# Gogo Admin — Design System Guidelines (Beils Dashboard)

> **Design intent (one sentence):** Apply the Gogo Admin Template look — Mulish
> typeface, soft grey canvas with white rounded cards, muted grey text, and a
> purple accent — consistently across every Beils dashboard surface, driven from
> a single token layer so no component is themed by hand.

These guidelines are **implementation-first**. Non-negotiable rules use **must**;
recommendations use **should**. Every accessibility rule is written to be testable.

---

## 1. Context and goals

- **Product surface:** authenticated dashboard web app (agenda, TPV, clients,
  sales, catalog, finance).
- **Audience:** salon operators and admins working fast on desktop and tablet.
- **Goal:** one coherent visual system applied globally from tokens, WCAG 2.2 AA,
  keyboard-first, no one-off spacing/color exceptions.
- **Single source of truth:** [`app/assets/css/main.css`](../app/assets/css/main.css)
  (`@theme` + the DaisyUI `gogo` theme). Components **must** consume semantic
  tokens (`bg-bg-card`, `text-text-primary`, `text-primary`, `border-border-default`,
  DaisyUI `btn`/`badge`/`input`…), never raw hex.

---

## 2. Design tokens and foundations

### 2.1 Typography
- Family: **Mulish** (`--font-sans`), registered via `@nuxtjs/google-fonts`
  (weights 300–800). Stack falls back to `ui-sans-serif, system-ui`.
- Base body: `text-sm` (14px) / weight 400; headings use weight 700–800.
- Scale (Tailwind): `text-xs 12 · text-sm 14 · text-base 16 · text-lg 18 ·
  text-xl 20 · text-2xl 24`. Components **must** use scale utilities, not
  arbitrary `text-[…px]` for body copy.
- Line length **should** stay 45–75ch for paragraphs.

### 2.2 Color (semantic tokens — do not use raw hex in components)

| Token | Value | Use |
|---|---|---|
| `--color-bg-app` | `#f8f8f8` | App canvas / page background |
| `--color-bg-card` | `#ffffff` | Cards, modals, raised surfaces |
| `--color-bg-muted` | `#f4f4f4` | Wells, inputs, subtle fills |
| `--color-bg-hover` | `#efefef` | Hover fills |
| `--color-border-subtle` | `#f0f0f0` | Hairlines, dividers |
| `--color-border-default` | `#e5e5e5` | Card/input borders |
| `--color-border-strong` | `#cccccc` | Emphasis borders |
| `--color-text-primary` | `#4d4d4d` | Body + headings (AA, 8.9:1) |
| `--color-text-secondary` | `#3d3d3d` | Strong text + dark CTA fills (AA) |
| `--color-text-muted` | `#808080` | Secondary text (AA on white, 3.5:1 → large/secondary only) |
| `--color-text-light` | `#a3a3a3` | Decorative only — **must not** carry essential text |

DaisyUI palette (accent + component colors), from the `gogo` theme:

| Role | Value |
|---|---|
| `primary` / `accent` | `#922c88` (Gogo purple) |
| `secondary` / `neutral` | `#3d3d3d` (dark CTAs) |
| `success` | `#16a34a` · `warning` `#d97706` · `error` `#dc2626` · `info` `#3b82f6` |
| `base-100/200/300` | `#ffffff` / `#f8f8f8` / `#f0f0f0` |

- Purple accent (`text-primary`, `bg-primary`, `btn-primary`, `badge-primary`)
  is for emphasis, active state, and key metrics — **should not** exceed ~10% of
  a screen's surface.
- Status colors **must** be used only for their meaning (success/warning/error).

### 2.3 Spacing
- 4px base grid. Use Tailwind steps (`gap-2/3/4`, `p-3/4/6`, `space-y-*`).
- One-off spacing (`p-[13px]`) **must not** be introduced.

### 2.4 Radius, elevation, motion
- Radius: cards/modals `rounded-2xl`–`rounded-3xl`; inputs/buttons `rounded-xl`;
  pills/badges `rounded-full`. DaisyUI: `--radius-box 1.125rem`,
  `--radius-field .75rem`, `--radius-selector 1rem`.
- Elevation: prefer `shadow-xs`/`shadow-sm`; reserve `shadow-lg`/`shadow-2xl` for
  overlays (drawers, modals). Flat-on-flat cards **should** rely on borders, not
  heavy shadows.
- Motion: `--gogo` durations 150ms (instant) / 300ms (fast), ease
  `cubic-bezier(0.16,1,0.3,1)`. Motion **must** respect
  `prefers-reduced-motion` (no essential info conveyed by motion alone).

---

## 3. Component-level rules

Every component family **must** define all states: **default, hover,
focus-visible, active, disabled, loading, error**, and handle **long content,
overflow, and empty state**.

### 3.1 Buttons (`btn`)
- Anatomy: label (+ optional leading icon 16px). Height ≥ 40px (`h-10`+); touch
  target ≥ 44×44px on mobile.
- Variants: **primary CTA** = dark neutral (`bg-text-secondary`/`btn-neutral`,
  white text); **accent** = `btn-primary` (purple) for emphasis; **ghost/outline**
  for secondary; **error** for destructive.
- States: hover −6% lightness or `/90`; `active` scale 0.97 (global rule);
  `disabled` `opacity-60` + `cursor-not-allowed` + `aria-disabled`; **loading**
  shows a spinner and **must** keep width stable and set `aria-busy="true"`.
- Keyboard/pointer/touch: focus-visible ring (global 2px purple outline);
  Enter/Space activate; no hover-only affordances.
- Content: labels **must** be verb-first and specific ("Confirmar reserva", not
  "OK"). Long labels **must** wrap or truncate with a title, never overflow.

### 3.2 Inputs / selects / textareas
- Height 44px (`h-11`), `rounded-xl`, `border-border-default`, `bg-bg-card`.
- Label above field, `text-[10px] uppercase tracking-widest text-text-muted`.
- Focus: `border-primary/50` + global focus-glow; **error**: `border-error` +
  message in `text-error` with `aria-describedby`.
- Placeholder is not a label — a visible label **must** exist.
- Disabled `opacity-60`. Overflowing option text **must** truncate, not clip.

### 3.3 Cards / panels
- `bg-bg-card`, `border-border-default`, `rounded-2xl`, `p-4`–`p-6`.
- Header (title + optional action) / body / optional footer. Titles `text-text-primary`
  font-bold; supporting copy `text-text-muted`.
- **Empty state must** be explicit (icon + one line + primary action), never a
  blank box (e.g., TPV catalog "No hay elementos en esta categoría").

### 3.4 Modals & drawers
- Overlay `bg-black/40 backdrop-blur-sm`; panel `bg-bg-card rounded-3xl shadow-2xl`.
- Stacking: overlays **must** sit above dropdowns (DaisyUI `.dropdown-content` is
  `z-index:999`); non-`<dialog>` modals **must** use `z-[1000]`+.
- Focus **must** move into the panel on open and return to the trigger on close;
  Esc **must** close; focus **must** be trapped while open.
- Any open menu/dropdown **must** be closed before opening a modal (blur active
  element) so it can't overlay the panel.

### 3.5 Tabs / segmented controls (TPV, Servicios)
- Active pill uses `bg-text-primary text-bg-card`; inactive `text-text-muted`.
- **must** expose `role="tab"`/`aria-selected`; Arrow keys move between tabs;
  active tab is programmatically focusable.
- Pill offset/width math **must** match tab count (e.g. `/3` for 3 tabs).

### 3.6 Tables & lists (sales, debts)
- Row hover `bg-bg-hover`; zebra optional via `bg-bg-muted/40`.
- Numeric columns `tabular-nums text-right`. Money **must** use `Intl.NumberFormat`
  (`es-ES`, EUR).
- Wide tables **must** live in an `overflow-x-auto` container; the page body
  **must not** scroll horizontally.
- Empty and loading (skeleton `animate-pulse`) states **must** be defined.

### 3.7 Badges / status pills
- `rounded-full`, `text-[9px]`–`text-xs` font-black uppercase. Map status → color
  token (success/warning/error/`primary`). Text **must** meet 4.5:1 on its fill.

### 3.8 Toasts
- `toast toast-end toast-bottom`, `z-[100]`+. Auto-dismiss 3–4s; **must** also be
  dismissible and use `role="status"` (polite) / `role="alert"` for errors.

### 3.9 Responsive behavior (all families)
- Mobile-first. Breakpoints: base <768 (stacked), `md` split panes, `lg`/`xl`
  wider grids. Catalog grids `grid-cols-2` → up to `2xl:grid-cols-5`.
- Touch targets ≥ 44px; primary actions reachable without hover.

---

## 4. Accessibility — testable acceptance criteria

- **Contrast:** body text `text-text-primary`/`secondary` on `bg-card`/`bg-app`
  **must** measure ≥ 4.5:1; large/secondary text ≥ 3:1. Verify with a contrast
  checker; `text-text-light` **must not** be used for essential text.
- **Focus visible:** every interactive element **must** show the 2px purple
  focus-visible outline; tab through each page and confirm no focus is hidden.
- **Keyboard:** all actions (open/close modal, switch tab, add to cart, submit)
  **must** be operable without a mouse; Esc closes overlays; focus returns to
  trigger.
- **Names/roles:** icon-only buttons **must** have `aria-label`; inputs **must**
  have associated `<label>`; tabs/toasts expose correct roles.
- **Motion:** with `prefers-reduced-motion: reduce`, non-essential animation
  **must** be suppressed; no information is conveyed by motion/color alone.
- **Targets:** interactive controls **must** be ≥ 44×44px on touch.

---

## 5. Content and tone standards

- Voice: concise, confident, implementation-focused. Spanish UI copy.
- Actions **must** be descriptive verbs: "Confirmar reserva", "Cobrar", "Vender
  bono" — never "OK", "Enviar", "Aceptar" alone.
- Errors state cause + fix: "Selecciona un cliente registrado para vender un
  bono" (not "Error").
- Empty states: one line of context + a clear next action.
- Numbers/money/dates **must** be locale-formatted (`es-ES`, EUR).

**Examples**
- ✅ "Selecciona un cliente registrado para vender un bono o paquete"
- ❌ "Cliente inválido"
- ✅ Button "Cobrar en TPV" · ❌ Button "Ir"

---

## 6. Anti-patterns and prohibited implementations

- **Must not** hardcode hex/`rgb()` or non-semantic Tailwind colors
  (`text-emerald-600`, `bg-black/40`) in components — map to tokens. *(Repo audit
  pending — see §migration.)*
- **Must not** introduce one-off spacing/typography (`p-[13px]`, `text-[15px]`).
- **Must not** ship low-contrast text or hidden/removed focus outlines.
- **Must not** render a dropdown/menu above an open modal, or leave a menu open
  when a modal opens.
- **Must not** use placeholder text as the only label, or icon-only controls
  without `aria-label`.
- **Must not** let wide content scroll the page body horizontally.

### Migration notes
- Theme is applied globally from `main.css`; components inheriting tokens are
  already re-skinned. A follow-up pass **should** replace remaining hardcoded
  colors (`grep -rEn "#([0-9a-fA-F]{3,6})|emerald-|amber-|rose-|black/|white/"
  app/components app/pages`) with tokens, prioritizing shared components
  (buttons, modals, cards, tables).
- Old warm-cream tokens are gone; anything relying on the beige palette
  **should** be re-checked against the neutral grey scale.

---

## 7. QA checklist (per screen / PR)

- [ ] Uses Mulish; no leftover Roboto-only overrides.
- [ ] Colors come from tokens (no raw hex in the diff).
- [ ] All interactive states present: default/hover/focus-visible/active/disabled/loading/error.
- [ ] Contrast AA verified for text and status fills.
- [ ] Full keyboard pass: tab order logical, Esc closes overlays, focus visible everywhere.
- [ ] Modals sit above menus; menus close before modals open.
- [ ] Empty + loading states defined.
- [ ] Wide content scrolls within its container; body has no horizontal scroll.
- [ ] Money/dates locale-formatted; action labels are descriptive verbs.
- [ ] `prefers-reduced-motion` respected.
