import {
	generateInvoiceNumber,
	processVerifactuInvoice,
} from '../../../utils/verifactu'
import type { IInvoice } from '~~/shared/types/invoice'

export default defineEventHandler(async event => {
	const method = event.node.req.method

	if (method === 'GET') {
		const query = getQuery(event)
		const status = query.status as string | undefined

		const whereClause: any = {}
		if (status) whereClause.status = status

		const carts = await prisma.cart.findMany({
			where: whereClause,
			include: {
				user: { select: { name: true, surname: true, email: true, avatar: true } },
				items: true,
				debts: true,
			},
			orderBy: { created_at: 'desc' },
		})

		return carts
	}

	if (method === 'POST') {
		const body = await readBody(event)
		const { user_id, items, ...cartData } = body

		// Wrap in transaction to ensure consistency
		const cart = await prisma.$transaction(async tx => {
			// Calculate totals from items to prevent client tampering
			let subtotal = 0
			let discount = cartData.discount || 0
			let total = 0

			const createdCart = await tx.cart.create({
				data: {
					user_id: user_id || null,
					status: cartData.status || 'pending',
					payment_method: cartData.payment_method || 'cash',
					notes: cartData.notes,
					applied_coupon: cartData.applied_coupon,
					applied_giftcard: cartData.applied_giftcard,
					subtotal: 0, 
					discount: discount,
					total: 0, 
					items: {
						create: items.map((item: any) => {
							const itemSubtotal = item.quantity * item.unit_price
							const itemTotal = itemSubtotal 

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
						}),
					},
				},
			})

			total = Number((total - discount).toFixed(2))
			if (total < 0) total = 0

			// Update cart with valid totals
			const updatedCart = await tx.cart.update({
				where: { cart_id: createdCart.cart_id },
				data: { 
					subtotal, 
					total, 
					stripe_installments: cartData.stripe_installments ? Number(cartData.stripe_installments) : null,
					stripe_payment_intent_id: cartData.stripe_payment_intent_id || null,
					stripe_status: cartData.stripe_status || null,
				}
			})

			// Create the associated Debt if it is a Stripe Installment Plan
			if (updatedCart.payment_method === 'stripe' && updatedCart.stripe_installments && updatedCart.stripe_installments > 1 && updatedCart.user_id) {
				const installmentsCount = updatedCart.stripe_installments;
				const firstPayment = Number((updatedCart.total / installmentsCount).toFixed(2));
				const remainingAmount = Number((updatedCart.total - firstPayment).toFixed(2));

				await tx.debt.create({
					data: {
						user_id: updatedCart.user_id,
						cart_id: updatedCart.cart_id,
						amount: updatedCart.total,
						remaining: remainingAmount,
						status: 'partial',
						notes: `Pago Fraccionado Stripe (${installmentsCount} cuotas)`,
					}
				});
			}

			return updatedCart;
		})

		// Perform VeriFactu submission OUTSIDE the transaction (Risk 3.2 mitigate)
		if (cartData.status === 'completed') {
			try {
				const currentUser = cart.user_id
					? await prisma.user.findUnique({
							where: { user_id: cart.user_id },
							select: { document_number: true },
						})
					: null

				const config = useRuntimeConfig()
				const invoiceType = currentUser?.document_number ? 'F1' : 'I'

				const invoiceNumber = await generateInvoiceNumber(invoiceType as 'F1' | 'I')
				
				const verifactuPayload: IInvoice = {
					id: cart.cart_id,
					invoiceNumber,
					issueDate: new Date().toISOString(),
					issuer: {
						nif: config.salonNif,
						name: config.salonName
					},
					totalAmount: cart.total
				}

				const { hash, qrUrl, aeatStatus } = await processVerifactuInvoice(verifactuPayload)

				// Update cart with verifactu results
				await prisma.cart.update({
					where: { cart_id: cart.cart_id },
					data: {
						invoice_number: invoiceNumber,
						invoice_type: invoiceType,
						qr_content: qrUrl,
						hash: hash,
						aeat_status: aeatStatus,
					}
				})
			} catch (vError) {
				console.error('VeriFactu processing failed after transaction:', vError)
				await prisma.cart.update({
					where: { cart_id: cart.cart_id },
					data: { aeat_status: 'error' }
				}).catch(() => {})
			}
		}

		// Re-fetch final cart with items and user info for response
		return await prisma.cart.findUnique({
			where: { cart_id: cart.cart_id },
			include: { items: true, user: { select: { name: true, surname: true, avatar: true } } },
		})
	}
})
