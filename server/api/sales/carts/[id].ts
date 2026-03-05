import {
	generateInvoiceNumber,
	generateInvoiceHash,
	generateQRData,
	submitToAEAT,
} from '../../../utils/verifactu'

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
				const nif = currentCart.user?.document_number || '00000000T' // F2 fallback NIF
				const invoiceType = currentCart.user?.document_number ? 'F1' : 'F2'

				// Fetch the latest hash from previous invoices to create the chain
				const lastInvoice = await prisma.cart.findFirst({
					where: { status: 'completed', hash: { not: null } },
					orderBy: { created_at: 'desc' },
				})
				const previousHash = lastInvoice?.hash || null

				const invoiceNumber = await generateInvoiceNumber(invoiceType as 'F1' | 'F2')
				const hash = generateInvoiceHash(
					nif,
					invoiceNumber,
					new Date(),
					invoiceType,
					currentCart.total,
					previousHash,
				)
				const qrData = generateQRData(nif, invoiceNumber, currentCart.total, hash)

				verifactuData = {
					invoice_number: invoiceNumber,
					invoice_type: invoiceType,
					qr_content: qrData,
					hash: hash,
					previous_hash: previousHash,
					aeat_status: 'pending_submission',
				}

				// Simulate asynchronous async submission to AEAT without blocking checkout
				submitToAEAT(verifactuData)
					.then(async (result: { status: string; message: string }) => {
						await prisma.cart.update({
							where: { cart_id: id },
							data: { aeat_status: result.status },
						})
					})
					.catch(console.error)
			}
		}

		// Usually a cart shouldn't be fully mutable after creation in TPV, just status updates
		const updatedCart = await prisma.cart.update({
			where: { cart_id: id },
			data: {
				status: body.status,
				payment_method: body.payment_method,
				notes: body.notes,
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
