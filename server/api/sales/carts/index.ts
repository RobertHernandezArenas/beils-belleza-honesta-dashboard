import type { Prisma } from '@prisma/client'
import {
	generateInvoiceNumber,
	processVerifactuInvoice,
} from '../../../utils/verifactu'
import { createSale } from '../../../modules/sales/create-sale'
import { createPrismaSalesRepository } from '../../../modules/sales/prisma-sales-repository'
import { parseDateRange, SALES_LIST_LIMIT } from '../../../utils/date-range'

export default defineEventHandler(async event => {
	const method = event.node.req.method

	if (method === 'GET') {
		const query = getQuery(event)
		const status = query.status as string | undefined

		const whereClause: Prisma.CartWhereInput = {}
		if (status) whereClause.status = status
		const range = parseDateRange(query)
		if (range) whereClause.created_at = range

		const carts = await prisma.cart.findMany({
			where: whereClause,
			include: {
				user: { select: { name: true, surname: true, email: true, phone: true, avatar: true, document_number: true } },
				items: true,
				debts: { include: { payments: true } },
			},
			orderBy: { created_at: 'desc' },
			// Safety net: a caller that sends no range still gets a bounded answer
			take: SALES_LIST_LIMIT,
		})

		return carts
	}

	if (method === 'POST') {
		const body = await readBody(event)
		const { user_id, items: rawItems, booking_id, ...cartData } = body
		const config = useRuntimeConfig()

		return await createSale(
			{
				sales: createPrismaSalesRepository(prisma),
				verifactu: { generateInvoiceNumber, submit: processVerifactuInvoice },
				issuer: { nif: config.salonNif, name: config.salonName },
				now: () => new Date(),
			},
			{ userId: user_id, bookingId: booking_id, rawItems, cartData },
		)
	}
})
