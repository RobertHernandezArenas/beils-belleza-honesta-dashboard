import type { Sale } from '~~/shared/types/domain'
import { getPeriodDateBounds } from './salesExportCalculations'

export interface FilterSalesOptions {
	searchQuery?: string
	filterDateMode?: 'single' | 'range'
	filterDateSingle?: string
	filterDateRange?: { start?: string; end?: string }
	filterPaymentMethod?: string
	summaryTimeframe?: 'day' | 'week' | 'month' | 'quarter' | 'year' | 'all'
	selectedQuarter?: number
	selectedYear?: number
	sortKey?: 'id' | 'date' | 'payment_method' | 'total' | 'client'
	sortOrder?: 'desc' | 'asc'
}

/**
 * Returns formatted invoice number if present, or synthetic ticket code BBH-YYYY-XXXX
 */
export function getTicketDisplay(sale: Sale): string {
	if (sale.invoice_number) {
		return sale.invoice_number
	}
	const year = new Date(sale.created_at).getFullYear()
	const shortId = (sale.cart_id?.split('-')[0] ?? '').substring(0, 4)
	return `BBH-${year}-${shortId}`
}

/**
 * Natural chronological comparison for ticket identifiers (e.g. BBH-09-2026-0001, BBH-2026-0001)
 * Compares by year, then month, then sequence number, falling back to numeric locale compare.
 */
export function compareTicketIds(idA: string, idB: string): number {
	// Pattern 1: PREFIX-MM-YYYY-NUMBER (e.g. BBH-09-2026-0001)
	const matchMonthlyA = idA.match(/^([A-Za-z]+)-(\d{2})-(\d{4})-(\d+)$/)
	const matchMonthlyB = idB.match(/^([A-Za-z]+)-(\d{2})-(\d{4})-(\d+)$/)

	if (matchMonthlyA && matchMonthlyB) {
		const [, prefixA, monthA, yearA, seqA] = matchMonthlyA
		const [, prefixB, monthB, yearB, seqB] = matchMonthlyB

		if (prefixA !== prefixB) {
			return prefixA!.localeCompare(prefixB!)
		}
		const diffYear = Number(yearA) - Number(yearB)
		if (diffYear !== 0) return diffYear

		const diffMonth = Number(monthA) - Number(monthB)
		if (diffMonth !== 0) return diffMonth

		return Number(seqA) - Number(seqB)
	}

	// Pattern 2: PREFIX-YYYY-NUMBER (e.g. BBH-2026-0001)
	const matchYearlyA = idA.match(/^([A-Za-z]+)-(\d{4})-(\d+)$/)
	const matchYearlyB = idB.match(/^([A-Za-z]+)-(\d{4})-(\d+)$/)

	if (matchYearlyA && matchYearlyB) {
		const [, prefixA, yearA, seqA] = matchYearlyA
		const [, prefixB, yearB, seqB] = matchYearlyB

		if (prefixA !== prefixB) {
			return prefixA!.localeCompare(prefixB!)
		}
		const diffYear = Number(yearA) - Number(yearB)
		if (diffYear !== 0) return diffYear

		return Number(seqA) - Number(seqB)
	}

	return idA.localeCompare(idB, undefined, { numeric: true })
}

/**
 * Parses YYYY-MM-DD string into local start-of-day Date (00:00:00.000)
 */
export function parseLocalDateStart(dateStr?: string | null): Date | null {
	if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null
	const parts = dateStr.split('-').map(Number)
	const y = parts[0]
	const m = parts[1]
	const d = parts[2]
	if (y === undefined || m === undefined || d === undefined) return null
	return new Date(y, m - 1, d, 0, 0, 0, 0)
}

/**
 * Parses YYYY-MM-DD string into local end-of-day Date (23:59:59.999)
 */
export function parseLocalDateEnd(dateStr?: string | null): Date | null {
	if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null
	const parts = dateStr.split('-').map(Number)
	const y = parts[0]
	const m = parts[1]
	const d = parts[2]
	if (y === undefined || m === undefined || d === undefined) return null
	return new Date(y, m - 1, d, 23, 59, 59, 999)
}

/**
 * Pure function to filter and sort sales lists without mutating the source array
 */
export function filterSalesList(sales: Sale[], options: FilterSalesOptions = {}): Sale[] {
	if (!sales || !sales.length) return []
	let result = sales

	// 1. Search Query
	if (options.searchQuery && options.searchQuery.trim()) {
		const query = options.searchQuery.toLowerCase().trim()
		result = result.filter((s: Sale) => {
			const clientName = s.user ? `${s.user.name || ''} ${s.user.surname || ''}`.toLowerCase() : ''
			const clientEmail = (s.user?.email || '').toLowerCase()
			const clientPhone = (s.user?.phone || '').toLowerCase()
			const cartId = (s.cart_id || '').toLowerCase()
			const invoiceNum = (s.invoice_number || '').toLowerCase()
			const ticketDisplay = getTicketDisplay(s).toLowerCase()

			return (
				clientName.includes(query) ||
				clientEmail.includes(query) ||
				clientPhone.includes(query) ||
				cartId.includes(query) ||
				invoiceNum.includes(query) ||
				ticketDisplay.includes(query)
			)
		})
	}

	// 2. Date Filtering
	const hasManualSingle = options.filterDateMode === 'single' && Boolean(options.filterDateSingle)
	const hasManualRange =
		options.filterDateMode === 'range' &&
		Boolean(options.filterDateRange?.start || options.filterDateRange?.end)

	if (hasManualSingle && options.filterDateSingle) {
		const start = parseLocalDateStart(options.filterDateSingle)
		const end = parseLocalDateEnd(options.filterDateSingle)
		if (start && end) {
			result = result.filter((s: Sale) => {
				const saleDate = new Date(s.created_at)
				return saleDate >= start && saleDate <= end
			})
		}
	} else if (hasManualRange) {
		const start = parseLocalDateStart(options.filterDateRange?.start)
		const end = parseLocalDateEnd(options.filterDateRange?.end)

		result = result.filter((s: Sale) => {
			const saleDate = new Date(s.created_at)
			if (start && saleDate < start) return false
			if (end && saleDate > end) return false
			return true
		})
	} else if (options.summaryTimeframe && options.summaryTimeframe !== 'all') {
		const { start, end } = getPeriodDateBounds(options.summaryTimeframe, {
			quarter: options.selectedQuarter,
			year: options.selectedYear,
		})

		if (start && end) {
			result = result.filter((s: Sale) => {
				const saleDate = new Date(s.created_at)
				return saleDate >= start && saleDate <= end
			})
		}
	}

	// 3. Payment Method
	if (options.filterPaymentMethod && options.filterPaymentMethod !== 'all') {
		const targetMethod = options.filterPaymentMethod.toLowerCase()
		result = result.filter(
			(s: Sale) => (s.payment_method || '').toLowerCase() === targetMethod
		)
	}

	// 4. Sorting
	if (options.sortKey) {
		const modifier = options.sortOrder === 'asc' ? 1 : -1
		result = [...result].sort((a: Sale, b: Sale) => {
			if (options.sortKey === 'date') {
				return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * modifier
			}
			if (options.sortKey === 'total') {
				return (a.total - b.total) * modifier
			}
			if (options.sortKey === 'payment_method') {
				return (a.payment_method || '').localeCompare(b.payment_method || '') * modifier
			}
			if (options.sortKey === 'client') {
				const nameA = a.user ? `${a.user.name || ''} ${a.user.surname || ''}`.toLowerCase() : 'zzzz'
				const nameB = b.user ? `${b.user.name || ''} ${b.user.surname || ''}`.toLowerCase() : 'zzzz'
				return nameA.localeCompare(nameB) * modifier
			}
			if (options.sortKey === 'id') {
				return compareTicketIds(getTicketDisplay(a), getTicketDisplay(b)) * modifier
			}
			return 0
		})
	}

	return result
}
