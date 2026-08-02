import { ref } from 'vue'

export type ThemeMode = 'light' | 'dark'

const THEME_KEY = 'beils-theme'
// Module-level singleton so every caller shares the same reactive state
const theme = ref<ThemeMode>('light')

const applyTheme = (mode: ThemeMode) => {
	theme.value = mode
	if (typeof document !== 'undefined') {
		document.documentElement.dataset.theme = mode
		document.documentElement.style.colorScheme = mode
	}
	try {
		localStorage.setItem(THEME_KEY, mode)
	} catch {
		/* ignore (private mode / SSR) */
	}
}

export function useTheme() {
	const setTheme = (mode: ThemeMode) => applyTheme(mode)
	const toggleTheme = () => applyTheme(theme.value === 'dark' ? 'light' : 'dark')

	/** Read saved preference (or system) and apply it. Call once on client init. */
	const initTheme = () => {
		let stored: string | null = null
		try {
			stored = localStorage.getItem(THEME_KEY)
		} catch {
			/* ignore */
		}
		const prefersDark =
			typeof window !== 'undefined' &&
			typeof window.matchMedia === 'function' &&
			window.matchMedia('(prefers-color-scheme: dark)').matches
		applyTheme(stored === 'dark' || stored === 'light' ? stored : prefersDark ? 'dark' : 'light')
	}

	return { theme, setTheme, toggleTheme, initTheme }
}
