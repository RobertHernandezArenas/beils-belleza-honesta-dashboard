import { computed } from 'vue'

/**
 * Theme-aware palette for ECharts. Charts can't read CSS variables directly, so
 * we expose resolved colors keyed off the current light/dark theme. Use it inside
 * a `computed` chart-option so the chart re-renders when the theme toggles:
 *
 *   const chart = useChartTheme()
 *   const option = computed(() => ({ ...chart.value ... }))
 */
export function useChartTheme() {
	const { theme } = useTheme()

	return computed(() => {
		const dark = theme.value === 'dark'
		return {
			// text
			text: dark ? '#e6e6e9' : '#4d4d4d',
			axis: dark ? '#9a9aa2' : '#8c8c8c',
			label: dark ? '#c9c9cf' : '#666666',
			// lines / grid
			grid: dark ? '#33333b' : '#ececec',
			axisLine: dark ? '#3a3a42' : '#dbd2c6',
			// surfaces
			surface: dark ? '#1f1f24' : '#ffffff', // pie slice borders (card bg)
			// tooltip
			tooltipBg: dark ? '#26262c' : '#1a1a1a',
			tooltipText: dark ? '#e6e6e9' : '#ffffff',
			tooltipBorder: dark ? '#3a3a42' : '#404040',
			// accent + primary series (must contrast the card bg)
			accent: dark ? '#c05bb4' : '#922c88',
			series: dark ? '#e6e6e9' : '#1a1a1a',
			// area gradient stops for line charts
			areaTop: dark ? 'rgba(192,91,180,0.28)' : 'rgba(26,26,26,0.22)',
			areaBottom: dark ? 'rgba(192,91,180,0.02)' : 'rgba(26,26,26,0.01)',
			// categorical palette (pie/donut/multi-series)
			palette: dark
				? ['#c05bb4', '#8b8b93', '#e6e6e9', '#6a6a72', '#45454f', '#ef4444']
				: ['#1a1a1a', '#dbd2c6', '#666666', '#8c8c8c', '#bababa', '#ef4444'],
			highlight: dark ? '#e6e6e9' : '#1a1a1a',
		}
	})
}
