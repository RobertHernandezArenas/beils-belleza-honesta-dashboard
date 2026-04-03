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

		// Get current cart details to check status and aeat submission
		const currentCart = await prisma.cart.findUnique({
			where: { cart_id: id },
			include: { items: true, user: { select: { document_number: true } } },
		})

		if (!currentCart) {
			throw createError({ statusCode: 404, statusMessage: 'Cart not found' })
		}

    if (currentCart.aeat_status === 'submitted') {
      // Keep a warning log but allow the change for this management dashboard
      console.warn(`Modifying a cart that was already submitted to AEAT (ID: ${id}). Consistency check required.`)
    }

		const updatedCart = await prisma.$transaction(async tx => {
			let subtotal = currentCart.subtotal
			let total = currentCart.total
			let discount = body.discount !== undefined ? body.discount : currentCart.discount

			// 1. Handle items update if provided
			if (body.items && Array.isArray(body.items)) {
				// Clear old items
				await tx.cartItem.deleteMany({ where: { cart_id: id } })

				// Create new items and recalculate
				subtotal = 0
				total = 0

				const newItems = body.items.map((item: any) => {
					const itemSubtotal = Number((item.quantity * item.unit_price).toFixed(2))
					const itemTotal = itemSubtotal // For simplicity, mirroring POST logic: total = subtotal

					subtotal = Number((subtotal + itemSubtotal).toFixed(2))
					total = Number((total + itemTotal).toFixed(2))

					return {
						item_type: item.item_type,
						item_id: item.item_id,
						name: item.name,
						quantity: item.quantity,
						unit_price: item.unit_price,
						tax_rate: item.tax_rate || 21.0,
						subtotal: itemSubtotal,
						total: itemTotal,
					}
				})

				await tx.cartItem.createMany({
					data: newItems.map((item: any) => ({ ...item, cart_id: id })),
				})

				total = Number((total - discount).toFixed(2))
				if (total < 0) total = 0
			} else if (body.discount !== undefined) {
				// Recalculate total if only discount changed
				total = Number((currentCart.subtotal - discount).toFixed(2))
				if (total < 0) total = 0
			}

			// 2. Handle VeriFactu context if completing
			let verifactuData: any = {}
			if (body.status === 'completed' && !currentCart.invoice_number) {
				const config = useRuntimeConfig()
				const nif = currentCart.user?.document_number || '00000000T'
				const invoiceType = currentCart.user?.document_number ? 'F1' : 'I'
				const invoiceNumber = await generateInvoiceNumber(invoiceType as 'F1' | 'I')

				const verifactuPayload: IInvoice = {
					id: currentCart.cart_id,
					invoiceNumber,
					issueDate: new Date().toISOString(),
					issuer: {
						nif: config.salonNif,
						name: config.salonName,
					},
					totalAmount: total,
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

			// 3. Update Cart
			const cart = await tx.cart.update({
				where: { cart_id: id },
				data: {
					user_id: body.user_id,
					status: body.status,
					payment_method: body.payment_method,
					notes: body.notes,
					subtotal,
					discount,
					total,
					...verifactuData,
				},
				include: { items: true, debts: true },
			})

			// 4. Update associated debts if total changed
			if (cart.debts.length > 0 && (body.items || body.discount !== undefined)) {
				for (const debt of cart.debts) {
					// This logic assumes 1 Cart : 1 Debt relationship commonly used in POS
					// If it was partial, we keep the paid amount and recalculate remaining
					const paidAmount = Number((debt.amount - debt.remaining).toFixed(2))
					const newRemaining = Number((cart.total - paidAmount).toFixed(2))

					await tx.debt.update({
						where: { debt_id: debt.debt_id },
						data: {
							amount: cart.total,
							remaining: newRemaining > 0 ? newRemaining : 0,
							status: newRemaining <= 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'pending',
						},
					})
				}
			}

			return cart
		})

		return updatedCart
	}

	if (method === 'DELETE') {
		// Because it cascades items but not debts (SetNull), check if it has debts
		await prisma.cart.delete({ where: { cart_id: id } })
		return { success: true }
	}
})
