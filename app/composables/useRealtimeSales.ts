import { useQueryClient } from '@tanstack/vue-query'

/**
 * Centralized real-time refresh for every view that shows collected money
 * (Overview "Total Ventas Hoy", Ventas "Total ventas este mes", deudas, agenda…).
 *
 * - Collection points (TPV sale, debt payment, booking charge) call
 *   `notifySalesChanged()` right after a successful mutation.
 * - Display pages call `listenSalesChanged()` in their setup so they refresh
 *   live even when the collection happens in another tab/device.
 *
 * Same-tab updates rely on local query invalidation; cross-tab updates rely on
 * the BroadcastChannel in `useSync` (a channel never receives its own message,
 * so we always invalidate locally as well).
 */

// Query keys (prefixes) that expose sales/collection totals.
// vue-query matches by prefix, so ['sales'] also covers ['sales','completed'].
const SALES_QUERY_KEYS: unknown[][] = [
	['sales'],
	['debts'],
	['bookings'],
	['carts-overview'],
	['debts-overview'],
	['bookings-overview'],
]

export function useRealtimeSales() {
	const queryClient = useQueryClient()
	const { emitSync, onSync } = useSync()

	const invalidateLocal = () => {
		for (const key of SALES_QUERY_KEYS) {
			queryClient.invalidateQueries({ queryKey: key })
		}
	}

	/** Call after any successful collection (sale, debt payment, booking charge). */
	const notifySalesChanged = () => {
		invalidateLocal()
		emitSync({ type: 'REFRESH_SALES' })
	}

	/** Call in the setup of any page/component that displays sales totals. */
	const listenSalesChanged = () => {
		onSync(event => {
			if (event.type === 'REFRESH_SALES' || event.type === 'REFRESH_BOOKINGS') {
				invalidateLocal()
			}
		})
	}

	return { notifySalesChanged, listenSalesChanged }
}
