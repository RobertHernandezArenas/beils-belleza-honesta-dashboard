# Color Audit — hardcoded colors vs. theme tokens

Scope: `app/components` + `app/pages`. Goal: everything that defines a *surface,
text, border or accent* should use a token so it follows the theme and
light/dark. Status colors may stay as DaisyUI status tokens.

## Summary (at time of audit)

| Category | Hits | Verdict |
|---|---|---|
| `rgba()/rgb()` (scoped shadows, scrollbars, glass) | ~70 | Mostly OK — subtle overlays; migrate only if they read wrong in dark. |
| `bg-white/NN`, `text-white`, `bg-black/NN` (with opacity) | ~103 | Mixed. `text-white` on dark buttons = keep. `bg-white/60` glass surfaces = **convert** for dark mode. `bg-black/40` overlays = keep. |
| Status colors (`emerald/green/amber/yellow/rose/red/blue/indigo-…`) | ~82 | Render acceptably in both themes; **should** map to `success/warning/error/info` tokens for consistency (phase 2). |
| Neutral greys (`slate/gray/zinc/neutral/stone-…`) | ~20 | **Convert** to `text-text-*` / `border-border-*`. |
| Raw hex (`#fff`, `#000`, `#ff0000`, …) | 8 | Reviewed — all legitimate (print receipts, ECharts config, cropper backdrop). No action. |

## Already fixed
- `app/layouts/default.vue` — logout button `#ff0000` → `error` token (theme-aware).
- Global surfaces/text/borders now flip with dark automatically (tokens in `theme.css`).
- **Phase 2 · Batch 1 — glass surfaces (done):** `.glass-card/.glass-surface/.glass-header`
  made theme-aware (color-mix on `--bg-card`); inline `bg-white/NN` surfaces →
  `bg-bg-card/NN` across TPV, client/product form modals, clientes/productos lists,
  agenda list, sales metrics, purchase edit, consent modal. Intentional white-on-dark
  overlays (TPV cart footer) intentionally kept.
- **Phase 2 · Batch 2 — neutral greys (done):** cancelled-status `stone-*` → `text-muted`
  tokens across all agenda views; `slate-*` SILVER tier badge, `neutral-*` sales
  metrics/table → `text-text-*` / `bg-bg-hover` tokens.

## Not touched on purpose
- Print receipt styles (`DebtDetailsModal.vue`) — must stay black-on-white paper.
- ECharts `textStyle`/`borderColor` hex (`ProfileBilling`, `ProfileOverview`,
  `reportes`) — chart config; theme charts separately in phase 2.
- `ImageCropperModal` black canvas backdrop — intentional.

## Phase 2 — conversion order (reviewable batches)

1. ~~**Glass surfaces for dark mode**~~ — ✅ done.
2. ~~**Neutral greys → tokens**~~ — ✅ done.
3. **Status colors → DaisyUI tokens** — *deliberately NOT blanket-converted.*
   Investigation showed many of these ~82 hits are **semantic color-coding**, not
   generic status: payment-method colors (`transfer` = orange in `useSales.ts`),
   tier badges (GOLD/SILVER gradients), etc. A blanket `emerald→success / amber→warning`
   sed would destroy that visual language, and they already render fine in both
   themes. Convert only case-by-case where a color is truly a generic success/
   warning/error/info state. Not a dark-mode blocker.
4. ~~**ECharts theming**~~ — ✅ done. New `useChartTheme()` composable returns a
   light/dark palette (text, axis, grid, tooltip, series, area gradient, categorical
   palette). Applied to `ProfileBilling` (donut), `ProfileOverview` (line) and
   `reportes` (line/pie/bar). Charts re-render on theme toggle via the reactive
   `computed` option bound to `VChart`. Print stylesheets left white on purpose.

### Guardrail
Run per batch: `grep` the target pattern, convert, then compile-check the SFCs.
Prioritize shared components (`shared/`, `ui/`, modals, tables) over one-off pages.
