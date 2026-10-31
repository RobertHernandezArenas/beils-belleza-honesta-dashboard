import { assertWithinSalesLimit, parseDateRange } from '../../utils/date-range'
import type { CartDetailRecord, SalesRepository } from './ports'

export interface ListCartsDeps {
	sales: SalesRepository
}

export interface ListCartsQuery {
	status?: string
	from?: unknown
	to?: unknown
	[key: string]: unknown
}

export async function listCarts(deps: ListCartsDeps, query: ListCartsQuery): Promise<CartDetailRecord[]> {
	const status = typeof query.status === 'string' ? query.status : undefined
	const range = parseDateRange(query)

	const carts = await deps.sales.listCarts({
		status,
		created_at: range,
	})

	return assertWithinSalesLimit(carts)
}

