import { parseDateRange } from '../../utils/date-range'
import type { SalesRepository, SalesSummary } from './ports'

export interface GetSalesSummaryDeps {
	sales: SalesRepository
}

export interface SalesSummaryResult {
	current: SalesSummary
	previous: SalesSummary
}

/**
 * Facturado/Tickets/Promedio for /ventas: a DB aggregate over completed sales, not a sum
 * over the fetched sales list, so the KPI stays correct even for a period with more sales
 * than the list's row cap (see SALES_LIST_LIMIT). `from`/`to` bound the active period;
 * `prevFrom`/`prevTo` bound the prior period used for the % change shown next to it.
 */
export async function getSalesSummary(deps: GetSalesSummaryDeps, query: Record<string, unknown>): Promise<SalesSummaryResult> {
	const current = parseDateRange(query)
	const previous = parseDateRange({ from: query.prevFrom, to: query.prevTo })

	const [currentSummary, previousSummary] = await Promise.all([
		deps.sales.sumCompletedSales(current),
		deps.sales.sumCompletedSales(previous),
	])

	return { current: currentSummary, previous: previousSummary }
}
