import type { Ref } from 'vue'
import { useEventListener } from '@vueuse/core'

/**
 * Dock-style magnification: items matching `selector` inside `container`
 * grow as the pointer approaches them horizontally (cosine falloff).
 * Only runs on fine pointers with motion allowed.
 */
export function useMagnification(container: Ref<HTMLElement | null>, selector: string, { max = 1.3, radius = 110 } = {}) {
	if (import.meta.server) return

	let frame = 0
	let pointerX: number | null = null

	const canMagnify = () =>
		window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
		!window.matchMedia('(prefers-reduced-motion: reduce)').matches

	const apply = () => {
		frame = 0
		const items = container.value?.querySelectorAll<HTMLElement>(selector) ?? []
		for (const el of items) {
			if (pointerX === null) {
				el.style.transform = ''
				continue
			}
			const rect = el.getBoundingClientRect()
			const distance = Math.min(Math.abs(pointerX - (rect.left + rect.width / 2)) / radius, 1)
			const scale = 1 + (max - 1) * ((Math.cos(Math.PI * distance) + 1) / 2)
			el.style.transform = `scale(${scale.toFixed(3)})`
		}
	}

	const schedule = (x: number | null) => {
		pointerX = x
		if (!frame) frame = requestAnimationFrame(apply)
	}

	useEventListener(container, 'pointermove', (e: PointerEvent) => {
		if (canMagnify()) schedule(e.clientX)
	})
	useEventListener(container, 'pointerleave', () => schedule(null))
}
