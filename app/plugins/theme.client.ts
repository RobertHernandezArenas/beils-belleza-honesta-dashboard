// Applies the persisted (or system) light/dark theme as early as possible on the client.
export default defineNuxtPlugin(() => {
	const { initTheme } = useTheme()
	initTheme()
})
