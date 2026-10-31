import {
	generateInvoiceNumber,
	processVerifactuInvoice,
} from '../../../utils/verifactu'
import { getCart } from '../../../modules/sales/get-cart'
import { updateCart } from '../../../modules/sales/update-cart'
import { deleteCart } from '../../../modules/sales/delete-cart'
import { createPrismaSalesRepository } from '../../../modules/sales/prisma-sales-repository'

export default defineEventHandler(async event => {
	const method = event.node.req.method
	const id = getRouterParam(event, 'id')

	if (!id) {
		throw createError({ statusCode: 400, statusMessage: 'Cart ID is required' })
	}

	const repo = createPrismaSalesRepository(prisma)

	if (method === 'GET') {
		return await getCart({ sales: repo }, id)
	}

	if (method === 'PUT') {
		const body = await readBody(event)
		const config = useRuntimeConfig()

		return await updateCart(
			{
				sales: repo,
				verifactu: { generateInvoiceNumber, submit: processVerifactuInvoice },
				issuer: { nif: config.salonNif, name: config.salonName },
				now: () => new Date(),
			},
			id,
			body,
		)
	}

	if (method === 'DELETE') {
		return await deleteCart({ sales: repo }, id)
	}
})
