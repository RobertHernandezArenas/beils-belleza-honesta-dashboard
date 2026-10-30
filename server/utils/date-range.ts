import { z } from 'zod'
import { createError } from 'h3'

/** Hard upper bound on rows a sales list endpoint returns, with or without a range. */
export const SALES_LIST_LIMIT = 1000

/** One row more than the limit, so an over-limit result can be detected and refused. */
export const SALES_FETCH_TAKE = SALES_LIST_LIMIT + 1

/**
 * Totals built from a truncated list would be wrong (Facturado, Cobrado, fiscal exports),
 * so a result over the limit is refused with a message to narrow the range, never cut.
 */
export function assertWithinSalesLimit<T>(rows: T[]): T[] {
	if (rows.length > SALES_LIST_LIMIT) {
		throw createError({
			statusCode: 400,
			statusMessage: `El rango tiene más de ${SALES_LIST_LIMIT} ventas. Reduce el rango de fechas.`,
		})
	}
	return rows
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/
const dateParam = z
	.string()
	.trim()
	.refine(value => !Number.isNaN(Date.parse(value)))
	.optional()

/**
 * Optional `from` / `to` query params (ISO date or datetime) as a Prisma date filter.
 * A date-only `to` includes that whole day (UTC). Returns undefined when no range was sent.
 */
export function parseDateRange(query: unknown): { gte?: Date; lte?: Date } | undefined {
	const blankToUndefined = (value: unknown) => (value === '' ? undefined : value)
	const raw = (query ?? {}) as Record<string, unknown>
	const parsed = z.object({ from: dateParam, to: dateParam }).safeParse({
		from: blankToUndefined(raw.from),
		to: blankToUndefined(raw.to),
	})
	if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Rango de fechas inválido' })

	const { from, to } = parsed.data
	const range: { gte?: Date; lte?: Date } = {}
	if (from) range.gte = new Date(from)
	if (to) range.lte = new Date(DATE_ONLY.test(to) ? `${to}T23:59:59.999Z` : to)
	if (range.gte && range.lte && range.gte > range.lte) {
		throw createError({ statusCode: 400, statusMessage: 'Rango de fechas inválido' })
	}
	return range.gte || range.lte ? range : undefined
}
