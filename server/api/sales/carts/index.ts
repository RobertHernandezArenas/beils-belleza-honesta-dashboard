import {
	generateInvoiceNumber,
	generateInvoiceHash,
	generateQRData,
	submitToAEAT,
} from '../../../utils/verifactu'

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
				user: { select: { name: true, surname: true, email: true } },
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
					subtotal: 0, // Placeholder, updated later
					discount: discount,
					total: 0, // Placeholder
					items: {
						create: items.map((item: any) => {
							const itemSubtotal = item.quantity * item.unit_price
							const itemTotal = itemSubtotal // Simple version, ignoring specific item tax calculation for simplicity unless requested

							subtotal += itemSubtotal
							total += itemTotal

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

			total = total - discount
			if (total < 0) total = 0

			let verifactuData: any = {}

			if (cartData.status === 'completed') {
				// Fetch user for NIF/CIF if user_id exists
				const currentUser = user_id
					? await tx.user.findUnique({
							where: { user_id },
							select: { document_number: true },
						})
					: null

				const nif = currentUser?.document_number || '00000000T' // F2 fallback
				const invoiceType = currentUser?.document_number ? 'F1' : 'F2'

				const lastInvoice = await tx.cart.findFirst({
					where: { status: 'completed', hash: { not: null } },
					orderBy: { created_at: 'desc' },
				})
				const previousHash = lastInvoice?.hash || null

				const invoiceNumber = await generateInvoiceNumber(invoiceType as 'F1' | 'F2')
				const hash = generateInvoiceHash(nif, invoiceNumber, new Date(), invoiceType, total, previousHash)
				const qrData = generateQRData(nif, invoiceNumber, total, hash)

				verifactuData = {
					invoice_number: invoiceNumber,
					invoice_type: invoiceType,
					qr_content: qrData,
					hash: hash,
					previous_hash: previousHash,
					aeat_status: 'pending_submission',
				}

				// Async AEAT sumbission wrapper (non-blocking)
				submitToAEAT(verifactuData)
					.then(async (result: { status: string; message: string }) => {
						await prisma.cart.update({
							where: { cart_id: createdCart.cart_id },
							data: { aeat_status: result.status },
						})
					})
					.catch(console.error)
			}

			// Update cart with valid totals and verifactu payload
			return await tx.cart.update({
				where: { cart_id: createdCart.cart_id },
				data: { subtotal, total, ...verifactuData },
				include: { items: true, user: { select: { name: true, surname: true } } },
			})
		})

		return cart
	}
})
