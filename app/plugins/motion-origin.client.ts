/**
 * Remembers where the user last pressed (outside a modal) so modals open from,
 * and close back toward, the control that triggered them. See .modal rules in main.css.
 */
export default defineNuxtPlugin(() => {
	const root = document.documentElement
	window.addEventListener(
		'pointerdown',
		e => {
			if ((e.target as Element | null)?.closest?.('.modal, dialog')) return
			root.style.setProperty('--motion-origin-x', `${e.clientX}px`)
			root.style.setProperty('--motion-origin-y', `${e.clientY}px`)
		},
		{ capture: true, passive: true },
	)
})
