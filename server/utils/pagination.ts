/** Page/limit from a query string, bounded so a request can't ask for unlimited rows. */
export function parsePagination(
	query: Record<string, unknown>,
	{ defaultLimit = 10, maxLimit = 1000 }: { defaultLimit?: number; maxLimit?: number } = {},
) {
	const toInt = (value: unknown) => Number.parseInt(String(value ?? ''), 10)
	const rawPage = toInt(query.page)
	const rawLimit = toInt(query.limit)
	const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1
	const limit = Number.isFinite(rawLimit) && rawLimit >= 1 ? Math.min(rawLimit, maxLimit) : defaultLimit
	return { page, limit, skip: (page - 1) * limit }
}
