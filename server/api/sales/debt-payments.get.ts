/**
 * Every debt payment with what /ventas needs to show it as a "Cobro de deuda" row and to
 * reprint its receipt and the sale's invoice (the sale, its items and all of the debt's payments).
 */
import { assertWithinSalesLimit, parseDateRange, SALES_FETCH_TAKE } from '../../utils/date-range'

export default defineEventHandler(async event => {
	const range = parseDateRange(getQuery(event))
	const payments = await prisma.debtPayment.findMany({
		where: range ? { payment_date: range } : undefined,
		include: {
			debt: {
				include: {
					user: { select: { name: true, surname: true, email: true, phone: true, document_number: true } },
					payments: { orderBy: { payment_date: 'asc' } },
					cart: {
						include: {
							items: true,
							user: { select: { name: true, surname: true, email: true, phone: true, document_number: true } },
							debts: { include: { payments: { orderBy: { payment_date: 'asc' } } } },
						},
					},
				},
			},
		},
		orderBy: { payment_date: 'desc' },
		take: SALES_FETCH_TAKE,
	})
	return assertWithinSalesLimit(payments)
})
