import {
	generateInvoiceNumber,
	processVerifactuInvoice,
} from '../../../utils/verifactu'
import { createSale } from '../../../modules/sales/create-sale'
import { listCarts } from '../../../modules/sales/list-carts'
import { createPrismaSalesRepository } from '../../../modules/sales/prisma-sales-repository'

export default defineEventHandler(async event => {
	const method = event.node.req.method
	const repo = createPrismaSalesRepository(prisma)

	if (method === 'GET') {
		const query = getQuery(event)
		return await listCarts({ sales: repo }, query)
	}

	if (method === 'POST') {
		const body = await readBody(event)
		const { user_id, items: rawItems, booking_id, ...cartData } = body
		const config = useRuntimeConfig()

		return await createSale(
			{
				sales: repo,
				verifactu: { generateInvoiceNumber, submit: processVerifactuInvoice },
				issuer: { nif: config.salonNif, name: config.salonName },
				now: () => new Date(),
			},
			{ userId: user_id, bookingId: booking_id, rawItems, cartData },
		)
	}
})
