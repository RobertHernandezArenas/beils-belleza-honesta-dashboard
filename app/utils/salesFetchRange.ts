import type { SummaryTimeframe } from '~/composables/useSalesAnalytics'

export interface SalesFetchRange {
	from?: string
	to?: string
}

const shiftDay = (day: string, days: number) => {
	const date = new Date(`${day}T00:00:00Z`)
	date.setUTCDate(date.getUTCDate() + days)
	return date.toISOString().slice(0, 10)
}

/**
 * What /ventas has to download for its active filters. The result is padded by a day (the
 * client filters stay exact) and, for the period buttons, reaches back to the start of the
 * previous year so period-over-period comparisons keep their data. "All time" is unbounded:
 * the server's own safety limit applies.
 */
export function salesFetchRange(filters: {
	mode: 'single' | 'range'
	single: string
	range: { start: string; end: string }
	timeframe: SummaryTimeframe
	year: number
	now?: Date
}): SalesFetchRange {
	if (filters.mode === 'single' && filters.single) {
		return { from: shiftDay(filters.single, -1), to: shiftDay(filters.single, 1) }
	}
	if (filters.mode === 'range' && (filters.range.start || filters.range.end)) {
		return {
			...(filters.range.start && { from: shiftDay(filters.range.start, -1) }),
			...(filters.range.end && { to: shiftDay(filters.range.end, 1) }),
		}
	}
	if (filters.timeframe === 'all') return {}

	const byYear = filters.timeframe === 'quarter' || filters.timeframe === 'year'
	const baseYear = byYear ? filters.year : (filters.now ?? new Date()).getFullYear()
	return {
		from: `${baseYear - 1}-01-01`,
		...(byYear && { to: `${baseYear + 1}-01-01` }),
	}
}
