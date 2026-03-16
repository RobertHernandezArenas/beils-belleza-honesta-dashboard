
/**
 * A custom ref that debounces its value updates.
 * Useful for search inputs to prevent excessive API calls.
 * 
 * @param value The initial value
 * @param delay The debounce delay in milliseconds (default: 500ms)
 */
export function useDebouncedRef<T>(value: T, delay = 500) {
	let timeout: any
	return customRef((track, trigger) => {
		return {
			get() {
				track()
				return value
			},
			set(newValue: T) {
				clearTimeout(timeout)
				timeout = setTimeout(() => {
					value = newValue
					trigger()
				}, delay)
			},
		}
	})
}
