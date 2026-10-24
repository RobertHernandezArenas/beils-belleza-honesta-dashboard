/**
 * Shared motion primitives. CSS tokens live in assets/css/main.css (--motion-*);
 * keep MOTION_EASE_DRAWER in sync with --motion-ease-drawer.
 */
export const MOTION_EASE_DRAWER = 'cubic-bezier(0.32, 0.72, 0, 1)'

export const prefersReducedMotion = () =>
	import.meta.client && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Physical spring (Apple-style params) as an easing function for GSAP/JS.
 * Returns the real settle time to use as the tween duration.
 */
export function spring(duration = 0.45, bounce = 0.25) {
	const zeta = 1 - bounce
	const omega = (2 * Math.PI) / duration
	const omegaD = omega * Math.sqrt(1 - zeta * zeta)
	const x = (t: number) =>
		1 - Math.exp(-zeta * omega * t) * (Math.cos(omegaD * t) + ((zeta * omega) / omegaD) * Math.sin(omegaD * t))

	let settle = duration
	for (let t = 0; t < 3; t += 0.005) {
		if (Math.abs(1 - x(t)) > 0.002) settle = t
	}
	return { duration: settle, ease: (p: number) => (p >= 1 ? 1 : x(p * settle)) }
}

/**
 * Crossfade the profile panel around a state change: the browser snapshots the old
 * panel as a cheap image and fades it into the new one. `html.vt-panel` scopes the
 * keyframes in main.css to this transition only.
 *
 * Elements opt in with `data-vt-name` + `data-vt-group`; the view-transition-name is applied
 * only while the transition runs (a permanent one creates a stacking context that traps
 * descendant modals below the profile header), and only to the given group, so a nested
 * control (e.g. the Health switch) is not captured when the outer tabs change.
 */
export function crossfadePanel(update: () => void, group: string) {
	if (typeof document.startViewTransition !== 'function' || prefersReducedMotion()) {
		update()
		return
	}
	const root = document.documentElement
	const named = document.querySelectorAll<HTMLElement>(`[data-vt-group="${group}"][data-vt-name]`)
	named.forEach(el => (el.style.viewTransitionName = el.dataset.vtName ?? ''))
	root.classList.add('vt-panel')
	document
		.startViewTransition(async () => {
			update()
			await nextTick()
		})
		.finished.finally(() => {
			named.forEach(el => (el.style.viewTransitionName = ''))
			root.classList.remove('vt-panel')
		})
}

/**
 * Container transform (morph): the live `panel` starts on the `source` element's
 * exact box (translated + clipped to its radius) and grows into place.
 * Pair it with an overlay using the same duration and MOTION_EASE_DRAWER.
 */
const sourceFrame = (panel: HTMLElement, source: HTMLElement): Keyframe => {
	const from = source.getBoundingClientRect()
	const to = panel.getBoundingClientRect()
	const radius = getComputedStyle(source).borderTopLeftRadius
	return {
		transform: `translate(${from.left - to.left}px, ${from.top - to.top}px)`,
		clipPath: `inset(0px ${Math.max(to.width - from.width, 0)}px ${Math.max(to.height - from.height, 0)}px 0px round ${radius})`,
		opacity: 0,
	}
}
const restFrame = (panel: HTMLElement): Keyframe => ({
	transform: 'translate(0px, 0px)',
	clipPath: `inset(0px 0px 0px 0px round ${getComputedStyle(panel).borderTopLeftRadius})`,
	opacity: 1,
})

export function morphIn(panel: HTMLElement, source: HTMLElement, duration = 400) {
	source.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, easing: 'ease-out', fill: 'forwards' })
	// Opacity reaches 1 at 30% so the panel reads as the source turning into it
	return panel.animate([sourceFrame(panel, source), { opacity: 1, offset: 0.3 }, restFrame(panel)], {
		duration,
		easing: MOTION_EASE_DRAWER,
	}).finished
}

export async function morphOut(panel: HTMLElement, source: HTMLElement, duration = 300) {
	source.animate([{ opacity: 0 }, { opacity: 1 }], {
		duration: 120,
		delay: duration - 120,
		easing: 'ease-out',
		fill: 'forwards',
	})
	await panel
		.animate([restFrame(panel), { opacity: 1, offset: 0.7 }, sourceFrame(panel, source)], {
			duration,
			easing: MOTION_EASE_DRAWER,
			fill: 'forwards',
		})
		.finished.catch(() => {})
	// Drops both the morphIn fade-out and this fade-in: the source is back to its natural opacity
	source.getAnimations().forEach(a => a.cancel())
}
