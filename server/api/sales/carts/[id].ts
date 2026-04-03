import {
	generateInvoiceNumber,
	processVerifactuInvoice,
} from '../../../utils/verifactu'
import type { IInvoice } from '~~/shared/types/invoice'

export default defineEventHandler(async event => {
	const method = event.node.req.method
	const id = getRouterParam(event, 'id')

	if (!id) {
		throw createError({ statusCode: 400, statusMessage: 'Cart ID is required' })
	}

	if (method === 'GET') {
		const cart = await prisma.cart.findUnique({
			where: { cart_id: id },
			include: {
				user: { select: { name: true, surname: true, email: true, phone: true } },
				items: true,
				debts: true,
			},
		})

		if (!cart) {
			throw createError({ statusCode: 404, statusMessage: 'Cart not found' })
		}

		return cart
	}

	if (method === 'PUT') {
		const body = await readBody(event)

		// If completing the cart, apply Veri*Factu Logic
		let verifactuData: any = {}

		if (body.status === 'completed') {
			// Get current cart details to compute hash
			const currentCart = await prisma.cart.findUnique({
				where: { cart_id: id },
				include: { user: { select: { document_number: true } } },
			})

			if (currentCart && !currentCart.invoice_number) {
				const config = useRuntimeConfig()
				const nif = currentCart.user?.document_number || '00000000T'
				const invoiceType = currentCart.user?.document_number ? 'F1' : 'I' // Simplified

				const invoiceNumber = await generateInvoiceNumber(invoiceType as 'F1' | 'I')
				
				const verifactuPayload: IInvoice = {
					id: currentCart.cart_id,
					invoiceNumber,
					issueDate: new Date().toISOString(),
					issuer: {
						nif: config.salonNif,
						name: config.salonName
					},
					totalAmount: currentCart.total
				}

				const { hash, qrUrl, aeatStatus } = await processVerifactuInvoice(verifactuPayload)

				verifactuData = {
					invoice_number: invoiceNumber,
					invoice_type: invoiceType,
					qr_content: qrUrl,
					hash: hash,
					aeat_status: aeatStatus,
				}
			}
		}

		// Usually a cart shouldn't be fully mutable after creation in TPV, just status updates
		const updatedCart = await prisma.cart.update({
			where: { cart_id: id },
			data: {
				status: body.status,
				payment_method: body.payment_method,
				notes: body.notes,
				user_id: body.user_id,
				...verifactuData,
			},
		})

		return updatedCart
	}

	if (method === 'DELETE') {
		// Because it cascades items but not debts (SetNull), check if it has debts
		await prisma.cart.delete({ where: { cart_id: id } })
		return { success: true }
	}
})
