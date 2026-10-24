import type { Ref } from 'vue'
import { useResizeObserver } from '@vueuse/core'

/**
 * Segmented-control pill that slides (and stretches) under the active item on a spring.
 * Bind `setItemRef(key)` on each item and render the pill with `pillStyle` + `.motion-pill`.
 * Until measured (SSR / first paint) `pill` is null: style the active item directly then.
 */
export function useSlidingPill<K extends string>(container: Ref<HTMLElement | null>, active: Ref<K>) {
	const items = new Map<K, HTMLElement>()
	const pill = ref<{ x: number; width: number } | null>(null)

	const measure = () => {
		const el = items.get(active.value)
		if (el) pill.value = { x: el.offsetLeft, width: el.offsetWidth }
	}

	const setItemRef = (key: K) => (el: unknown) => {
		if (el instanceof HTMLElement) items.set(key, el)
	}

	const pillStyle = computed(() =>
		pill.value ? { width: `${pill.value.width}px`, transform: `translateX(${pill.value.x}px)` } : undefined,
	)

	watch(active, () => nextTick(measure))
	useResizeObserver(container, measure)

	return { pill, pillStyle, setItemRef }
}
