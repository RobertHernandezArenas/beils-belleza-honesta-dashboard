import type { IncomingLineItem } from '~~/shared/types/line-item'
import type { Prisma } from '@prisma/client'
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

		const whereClause: Prisma.CartWhereInput = {}
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

		// Selling a bono/package assigns it to a person, so a registered client is required.
		const hasPackageSale = Array.isArray(items) &&
			items.some((it: IncomingLineItem) => (it.item_type || '').toLowerCase() === 'package_sale')
		if (hasPackageSale && !user_id) {
			throw createError({
				statusCode: 400,
				statusMessage: 'Selecciona un cliente registrado para vender un bono o paquete',
			})
		}

		// Wrap in transaction to ensure consistency
		const cart = await prisma.$transaction(async tx => {
			let effectiveBookingId = booking_id || null

			if (effectiveBookingId) {
				await tx.booking.update({
					where: { booking_id: effectiveBookingId },
					data: { status: 'COMPLETADA' },
				})
			} else if (user_id) {
				// Auto-link: If no explicit booking_id was passed, check for an unlinked booking around today for this client
				const now = new Date()
				const windowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1, 0, 0, 0, 0))
				const windowEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 23, 59, 59, 999))

				const candidateBooking = await tx.booking.findFirst({
					where: {
						client_id: user_id,
						booking_date: { gte: windowStart, lte: windowEnd },
						status: { notIn: ['CANCELADA', 'AUSENTE', 'cancelled', 'no_show'] },
						carts: { none: { status: 'completed' } },
					},
					orderBy: [
						{ booking_date: 'desc' },
						{ start_time: 'desc' },
					],
				})

				if (candidateBooking) {
					effectiveBookingId = candidateBooking.booking_id
					await tx.booking.update({
						where: { booking_id: effectiveBookingId },
						data: { status: 'COMPLETADA' },
					})
				}
			}

			// Calculate totals from items to prevent client tampering
			let subtotal = 0
			const discount = cartData.discount || 0
			let total = 0

			const createdCart = await tx.cart.create({
				data: {
					user_id: user_id || null,
					booking_id: effectiveBookingId,
					status: cartData.status || 'pending',
					payment_method: cartData.payment_method || 'cash',
					notes: cartData.notes,
					subtotal: 0,  
					discount: discount,
					total: 0, 
					items: {
						create: items.map((item: IncomingLineItem) => {
							const itemSubtotal = item.quantity * item.unit_price;
							const itemTotal = itemSubtotal;

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

			// Process post-creation actions for each item (deduct package sessions)
			for (const item of items) {
				const isPackageItem = (item.item_type || '').toLowerCase() === 'package' || 
					(item.name && (item.name.includes('[SESIÓN BONO]') || item.name.includes('[BONO MIXTO]')))

				if (isPackageItem) {
					const qtyToDeduct = Math.max(1, Number(item.quantity) || 1)

					// Every path goes through consumeClientPackage*/: owner-or-beneficiary, active,
					// not expired, enough balance, atomic decrement. A 4xx here rolls back the sale.
					const consumption = asConsumptionTx(tx)
					const consumeOpts = { consumerId: user_id, qty: qtyToDeduct }

					// 1. Explicit ClientPackageItem (one service inside a bono)
					const clientPkgItem = await tx.clientPackageItem.findUnique({
						where: { client_package_item_id: item.item_id }
					}).catch(() => null)

					if (clientPkgItem) {
						await consumeClientPackageItem(consumption, { clientPackageItemId: clientPkgItem.client_package_item_id, ...consumeOpts })
					} else {
						// 2. Explicit ClientPackage (whole bono)
						const clientPkg = await tx.clientPackage.findUnique({
							where: { client_package_id: item.item_id }
						}).catch(() => null)

						if (clientPkg) {
							await consumeClientPackage(consumption, { clientPackageId: clientPkg.client_package_id, ...consumeOpts })
						} else if (user_id) {
							// 3. Fallback: auto-match one of the client's OWN usable bonos (never a shared one:
							// spending someone else's bono must be an explicit choice).
							const cleanName = item.name ? item.name.replace(/\[.*?\]\s*/g, '').trim() : ''
							const usableOwnPackage = {
								user_id,
								status: 'ACTIVE',
								OR: [{ expiry_date: null }, { expiry_date: { gt: new Date() } }],
							}

							const matchingSubItem = await tx.clientPackageItem.findFirst({
								where: {
									client_package: usableOwnPackage,
									quantity_remaining: { gte: qtyToDeduct },
									OR: [
										{ package_item_id: item.item_id },
										{ name: { contains: cleanName } }
									]
								}
							})

							if (matchingSubItem) {
								await consumeClientPackageItem(consumption, { clientPackageItemId: matchingSubItem.client_package_item_id, ...consumeOpts })
							} else {
								const matchingPkg = await tx.clientPackage.findFirst({
									where: {
										...usableOwnPackage,
										remaining_sessions: { gte: qtyToDeduct },
										AND: [{
											OR: [
												{ package_id: item.item_id },
												{ package: { name: { contains: cleanName } } }
											]
										}]
									}
								})

								if (matchingPkg) {
									await consumeClientPackage(consumption, { clientPackageId: matchingPkg.client_package_id, ...consumeOpts })
								}
							}
						}
					}
				}
			}

			// Sell bonos/packages: create a ClientPackage for the client for each catalog package sold.
			// (Consumption items use item_type 'package' and are handled by the deduction loop above.)
			for (const item of items) {
				if ((item.item_type || '').toLowerCase() !== 'package_sale') continue

				const catalogPkg = await tx.package.findUnique({
					where: { package_id: item.item_id },
					include: { items: true },
				})
				if (!catalogPkg) continue

				const totalServiceSessions = catalogPkg.type === 'MIXTO' && catalogPkg.items?.length
					? catalogPkg.items
							.filter(it => it.item_type === 'SERVICE')
							.reduce((sum, it) => sum + (it.quantity || 0), 0)
					: catalogPkg.total_sessions

				const expiryDate = new Date()
				expiryDate.setMonth(expiryDate.getMonth() + 6)

				const units = Math.max(1, Number(item.quantity) || 1)
				for (let i = 0; i < units; i++) {
					const cp = await tx.clientPackage.create({
						data: {
							user_id,
							package_id: catalogPkg.package_id,
							total_sessions: totalServiceSessions,
							remaining_sessions: totalServiceSessions,
							expiry_date: expiryDate,
							status: 'ACTIVE',
						},
					})

					if (catalogPkg.items?.length) {
						await tx.clientPackageItem.createMany({
							data: catalogPkg.items.map(it => ({
								client_package_id: cp.client_package_id,
								package_item_id: it.package_item_id,
								name: it.name,
								item_type: it.item_type,
								quantity_total: it.quantity,
								quantity_remaining: it.quantity,
								duration: it.duration,
							})),
						})
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
