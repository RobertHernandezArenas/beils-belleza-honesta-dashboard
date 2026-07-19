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
		const { user_id, items, booking_id, ...cartData } = body

		// Wrap in transaction to ensure consistency
		const cart = await prisma.$transaction(async tx => {
			if (booking_id) {
				await tx.booking.update({
					where: { booking_id },
					data: { status: 'COMPLETADA' },
				})
			}
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
					subtotal: 0,  
					discount: discount,
					total: 0, 
					items: {
						create: items.map((item: any) => {
							const isBonusApplied = !!item.applied_client_bonus_id;
							const itemSubtotal = item.quantity * item.unit_price;
							// If a bonus is applied, the item total is 0
							const itemTotal = isBonusApplied ? 0 : itemSubtotal;

							subtotal = Number((subtotal + itemSubtotal).toFixed(2));
							total = Number((total + itemTotal).toFixed(2));

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

			// Process post-creation actions for each item
			for (const item of items) {
				// 1. Deduct Bonus Session
				if (item.applied_client_bonus_id) {
					const cb = await tx.clientBonus.findUnique({ where: { client_bonus_id: item.applied_client_bonus_id } });
					if (cb && cb.remaining_sessions > 0) {
						const newRemaining = cb.remaining_sessions - item.quantity;
						await tx.clientBonus.update({
							where: { client_bonus_id: item.applied_client_bonus_id },
							data: {
								remaining_sessions: newRemaining,
								status: newRemaining <= 0 ? 'agotado' : 'activo'
							}
						});
					}
				}



				// 3. Generar nuevo Bono (ClientBonus) si se está comprando
				if ((item.item_type === 'bonus' || item.item_type === 'BONUS') && !item.applied_client_bonus_id && user_id) {
					const bonusTemplate = await tx.bonus.findUnique({ where: { bonus_id: item.item_id } });
					if (bonusTemplate) {
						// Si compra cantidad > 1, creamos múltiples bonos
						for (let i = 0; i < item.quantity; i++) {
							await tx.clientBonus.create({
								data: {
									client_id: user_id,
									bonus_id: item.item_id,
									remaining_sessions: bonusTemplate.total_sessions,
									status: 'activo'
								}
							});
						}
					}
				}

			}

			total = Number((total - discount).toFixed(2))
			if (total < 0) total = 0

			// Update cart with valid totals
			const updatedCart = await tx.cart.update({
				where: { cart_id: createdCart.cart_id },
				data: { 
					subtotal, 
					discount,
					total, 
				}
			})

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
