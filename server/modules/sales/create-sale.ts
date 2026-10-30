import { createError } from 'h3'
import {
	parseSaleLines,
	priceSaleLines,
	saleSubtotal,
	parseSaleDiscountRequest,
	priceSaleDiscounts,
} from '../../utils/sale-pricing'
import { redeemCouponForSale } from '../../utils/coupons'
import { resolvePaymentRecord } from '../../utils/sale-payments'
import { consumeClientPackage, consumeClientPackageItem } from '../../utils/package-consumption'
import { invoiceCart, type InvoiceType, type InvoicingDeps } from '../shared/invoicing'
import type { SalesRepository, SaleUnitOfWork } from './ports'

export interface CreateSaleInput {
	userId?: string | null
	bookingId?: string | null
	/** Raw request lines: validated and priced from the catalog here, client prices are ignored */
	rawItems: unknown
	/** The rest of the request body (payment_method, status, notes, coupon_code, ...) */
	cartData: Record<string, unknown> & { payment_method?: string; status?: string; notes?: string }
}

export interface CreateSaleDeps<TView> extends InvoicingDeps {
	sales: SalesRepository<TView>
}

type PricedLine = ReturnType<typeof priceSaleLines>[number]

/** Marks the booking as done: the explicit one, or an unlinked booking of this client around today */
async function completeBookingFor(uow: SaleUnitOfWork, now: Date, userId: string | null | undefined, bookingId: string | null) {
	if (bookingId) {
		await uow.completeBooking(bookingId)
		return bookingId
	}
	if (!userId) return null

	// Auto-link: no explicit booking_id, so look for an unlinked booking around today for this client
	const windowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1, 0, 0, 0, 0))
	const windowEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 23, 59, 59, 999))
	const candidate = await uow.findUnlinkedBookingAround(userId, windowStart, windowEnd)
	if (!candidate) return null

	await uow.completeBooking(candidate.booking_id)
	return candidate.booking_id
}

/** Deducts bono sessions for the "package" lines. A 4xx here rolls back the sale. */
async function consumePackageLines(uow: SaleUnitOfWork, deps: { now: () => Date }, userId: string | null | undefined, items: PricedLine[]) {
	for (const item of items) {
		const isPackageItem = (item.item_type || '').toLowerCase() === 'package' ||
			(item.name && (item.name.includes('[SESIÓN BONO]') || item.name.includes('[BONO MIXTO]')))
		if (!isPackageItem) continue

		const qtyToDeduct = Math.max(1, Number(item.quantity) || 1)

		// Every path goes through consumeClientPackage*: owner-or-beneficiary, active,
		// not expired, enough balance, atomic decrement.
		const consumption = uow.consumptionTx
		const consumeOpts = { consumerId: userId, qty: qtyToDeduct }

		// 1. Explicit ClientPackageItem (one service inside a bono)
		const clientPkgItem = await uow.findClientPackageItem(item.item_id)
		if (clientPkgItem) {
			await consumeClientPackageItem(consumption, { clientPackageItemId: clientPkgItem.client_package_item_id, ...consumeOpts })
			continue
		}

		// 2. Explicit ClientPackage (whole bono)
		const clientPkg = await uow.findClientPackage(item.item_id)
		if (clientPkg) {
			await consumeClientPackage(consumption, { clientPackageId: clientPkg.client_package_id, ...consumeOpts })
			continue
		}

		if (!userId) continue

		// 3. Fallback: auto-match one of the client's OWN usable bonos (never a shared one:
		// spending someone else's bono must be an explicit choice).
		const cleanName = item.name ? item.name.replace(/\[.*?\]\s*/g, '').trim() : ''
		const query = { userId, itemId: item.item_id, cleanName, qty: qtyToDeduct, now: deps.now() }

		const matchingSubItem = await uow.findOwnUsablePackageItem(query)
		if (matchingSubItem) {
			await consumeClientPackageItem(consumption, { clientPackageItemId: matchingSubItem.client_package_item_id, ...consumeOpts })
			continue
		}

		const matchingPkg = await uow.findOwnUsablePackage(query)
		if (matchingPkg) {
			await consumeClientPackage(consumption, { clientPackageId: matchingPkg.client_package_id, ...consumeOpts })
		}
	}
}

/** Sells bonos/packages: one ClientPackage per unit of each catalog package sold. */
async function createSoldPackages(uow: SaleUnitOfWork, deps: { now: () => Date }, userId: string, items: PricedLine[]) {
	// (Consumption items use item_type 'package' and are handled by consumePackageLines.)
	for (const item of items) {
		if ((item.item_type || '').toLowerCase() !== 'package_sale') continue

		const catalogPkg = await uow.findCatalogPackage(item.item_id)
		if (!catalogPkg) continue

		const totalServiceSessions = catalogPkg.type === 'MIXTO' && catalogPkg.items?.length
			? catalogPkg.items
					.filter(it => it.item_type === 'SERVICE')
					.reduce((sum, it) => sum + (it.quantity || 0), 0)
			: catalogPkg.total_sessions

		const expiryDate = new Date(deps.now())
		expiryDate.setMonth(expiryDate.getMonth() + 6)

		const units = Math.max(1, Number(item.quantity) || 1)
		for (let i = 0; i < units; i++) {
			const cp = await uow.createClientPackage({
				user_id: userId,
				package_id: catalogPkg.package_id,
				total_sessions: totalServiceSessions,
				remaining_sessions: totalServiceSessions,
				expiry_date: expiryDate,
				status: 'ACTIVE',
			})

			if (catalogPkg.items?.length) {
				await uow.createClientPackageItems(catalogPkg.items.map(it => ({
					client_package_id: cp.client_package_id,
					package_item_id: it.package_item_id,
					name: it.name,
					item_type: it.item_type,
					quantity_total: it.quantity,
					quantity_remaining: it.quantity,
					duration: it.duration,
				})))
			}
		}
	}
}

/**
 * Creates a sale (normal or debt "A deber"). Prices and tax come from the catalog, the coupon
 * use is counted and the debt is created inside the same transaction as the cart. The invoice
 * is issued after the commit.
 */
export async function createSale<TView>(deps: CreateSaleDeps<TView>, input: CreateSaleInput): Promise<TView> {
	const { sales } = deps
	const { userId, bookingId, rawItems, cartData } = input
	const paymentMethod: string = cartData.payment_method || 'cash'
	const isDebtSale = paymentMethod === 'debt'

	// Prices and tax come from the catalog, never from the request (client prices are ignored)
	const saleLines = parseSaleLines(rawItems)
	const items = priceSaleLines(saleLines, await sales.loadCatalog(saleLines))
	const subtotal = saleSubtotal(items)
	// Only the coupon code and the manual rule are read; every amount is recomputed here
	const discountRequest = parseSaleDiscountRequest(cartData)

	// Selling a bono/package assigns it to a person, so a registered client is required.
	const hasPackageSale = items.some(it => it.item_type === 'package_sale')
	if (hasPackageSale && !userId) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Selecciona un cliente registrado para vender un bono o paquete',
		})
	}

	// A debt sale is owed by a registered client
	if (isDebtSale && !userId) {
		throw createError({ statusCode: 400, statusMessage: 'Selecciona un cliente para dejar a deber.' })
	}

	// One transaction to ensure consistency
	const cart = await sales.transaction(async uow => {
		const effectiveBookingId = await completeBookingFor(uow, deps.now(), userId, bookingId || null)

		// The coupon use is counted here (debt sales too): if the sale fails, it is rolled back.
		// Totals come from the catalog-priced items, never from the request.
		const coupon = discountRequest.couponCode
			? await redeemCouponForSale(uow.couponTx, { code: discountRequest.couponCode, subtotal, now: deps.now() })
			: null
		const manual = discountRequest.manual ?? null
		const pricing = priceSaleDiscounts(subtotal, coupon?.rule ?? null, manual)
		// A mixed payment must add up to the server total (a 400 rolls the coupon use back too)
		const payment = resolvePaymentRecord(paymentMethod, cartData.payment_breakdown, pricing.total)

		const createdCart = await uow.createCart({
			user_id: userId || null,
			booking_id: effectiveBookingId,
			// A debt sale is invoiced like any other sale; what is owed lives in its Debt
			status: isDebtSale ? 'completed' : cartData.status || 'pending',
			payment_method: payment.payment_method,
			payment_breakdown: payment.payment_breakdown,
			notes: cartData.notes,
			subtotal: pricing.subtotal,
			discount: pricing.totalDiscount,
			total: pricing.total,
			coupon_id: coupon?.coupon_id ?? null,
			coupon_code: coupon?.code ?? null,
			coupon_discount_type: coupon?.rule.type ?? null,
			coupon_discount_value: coupon?.rule.value ?? null,
			coupon_discount_amount: coupon ? pricing.couponAmount : null,
			manual_discount_type: manual?.type ?? null,
			manual_discount_value: manual?.value ?? null,
			manual_discount_amount: manual ? pricing.manualAmount : null,
			items: items.map(item => {
				const itemSubtotal = item.quantity * item.unit_price

				return {
					item_type: item.item_type,
					item_id: item.item_id,
					name: item.name,
					quantity: item.quantity,
					unit_price: item.unit_price,
					tax_rate: item.tax_rate || 21.0,
					subtotal: itemSubtotal,
					total: itemSubtotal,
				}
			}),
		})

		// The debt is created with the sale: both exist or neither does
		if (isDebtSale) {
			await uow.createDebt({
				// A debt sale always has a registered client (checked above)
				user_id: userId as string,
				cart_id: createdCart.cart_id,
				amount: pricing.total,
				remaining: pricing.total,
				status: pricing.total > 0 ? 'pending' : 'paid',
			})
		}

		// Post-creation actions for each item (deduct package sessions)
		await consumePackageLines(uow, deps, userId, items)
		// Sell bonos/packages (a registered client is guaranteed when there is a package_sale line)
		await createSoldPackages(uow, deps, userId as string, items)

		return createdCart
	})

	// Perform VeriFactu submission OUTSIDE the transaction (Risk 3.2 mitigate)
	if (cart.status === 'completed') {
		await invoiceCart(
			{ ...deps, store: sales },
			cart,
			async (): Promise<InvoiceType> => {
				const currentUser = cart.user_id ? await sales.findUserDocument(cart.user_id) : null
				return currentUser?.document_number ? 'F1' : 'I'
			},
			'VeriFactu processing failed after transaction:',
		)
	}

	// Re-fetch final cart with items and user info for response
	return await sales.findCartView(cart.cart_id)
}
