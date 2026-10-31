import { createError } from 'h3'
import type { IncomingLineItem } from '../../../shared/types/line-item'
import type { IInvoice } from '../../../shared/types/invoice'
import {
	parseSaleLines,
	priceSaleLines,
	saleSubtotal,
	parseSaleDiscountRequest,
	priceSaleDiscounts,
} from '../../utils/sale-pricing'
import { couponRuleOf, manualRuleOf } from '../../../shared/utils/discounts'
import { parsePaymentBreakdown } from '../../../shared/utils/payments'
import { resolvePaymentRecord } from '../../utils/sale-payments'
import type { CartDetailRecord, SalesRepository } from './ports'
import type { VerifactuGateway } from '../shared/invoicing'

export interface UpdateCartInput {
	user_id?: string
	items?: unknown
	coupon_code?: unknown
	payment_method?: string
	payment_breakdown?: unknown
	status?: string
	notes?: string
	created_at?: string
	manual_discount_type?: string
	manual_discount_value?: number
	[key: string]: unknown
}

export interface UpdateCartDeps {
	sales: SalesRepository
	verifactu?: VerifactuGateway
	issuer?: { nif: string; name: string }
	now?: () => Date
}

export async function updateCart(
	deps: UpdateCartDeps,
	id: string,
	input: UpdateCartInput,
): Promise<CartDetailRecord> {
	if (!id) {
		throw createError({ statusCode: 400, statusMessage: 'Cart ID is required' })
	}

	const currentCart = await deps.sales.findCartForUpdate(id)
	if (!currentCart) {
		throw createError({ statusCode: 404, statusMessage: 'Cart not found' })
	}

	// The coupon is locked after the sale: a different (or cleared) code is rejected, not ignored
	if (input.coupon_code !== undefined) {
		const normalize = (code: unknown) => (typeof code === 'string' ? code.trim().toUpperCase() : '')
		if (normalize(input.coupon_code) !== normalize(currentCart.coupon_code)) {
			throw createError({ statusCode: 400, statusMessage: 'El cupón de una venta no se puede cambiar' })
		}
	}

	if (currentCart.aeat_status === 'submitted') {
		console.warn(`Modifying a cart that was already submitted to AEAT (ID: ${id}). Consistency check required.`)
	}

	// Edited lines are re-priced from the catalog and the discount is bounded, before anything changes
	let pricedItems: ReturnType<typeof priceSaleLines> | null = null
	if (input.items !== undefined) {
		const lines = parseSaleLines(input.items)
		pricedItems = priceSaleLines(lines, await deps.sales.loadCatalog(lines))
	}

	// The coupon is locked after the sale: its stored rule is re-applied to the new subtotal
	const discountRequest = parseSaleDiscountRequest(input)
	const couponRule = couponRuleOf(currentCart)
	const manualRule = discountRequest.manual !== undefined ? discountRequest.manual : manualRuleOf(currentCart)
	const repriced = !!pricedItems || discountRequest.manual !== undefined
	const pricing = repriced
		? priceSaleDiscounts(pricedItems ? saleSubtotal(pricedItems) : currentCart.subtotal, couponRule, manualRule)
		: null

	// Payment: a mixed split must add up to the (possibly repriced) total.
	let paymentData: Record<string, unknown> = {}
	const nextTotal = pricing ? pricing.total : currentCart.total
	if (input.payment_method !== undefined || input.payment_breakdown !== undefined) {
		const method: string = (input.payment_method as string) ?? currentCart.payment_method ?? 'cash'
		const breakdown = input.payment_breakdown ?? parsePaymentBreakdown(currentCart.payment_breakdown)
		paymentData = resolvePaymentRecord(method, breakdown, nextTotal)
	} else if (currentCart.payment_method === 'mixed' && nextTotal !== currentCart.total) {
		paymentData = { payment_breakdown: null }
	}

	// Handle VeriFactu context if completing
	let verifactuData: Record<string, unknown> = {}
	if (input.status === 'completed' && !currentCart.invoice_number && deps.verifactu && deps.issuer) {
		const invoiceType = currentCart.user?.document_number ? 'F1' : 'I'
		const invoiceNumber = await deps.verifactu.generateInvoiceNumber(invoiceType)
		const now = deps.now ? deps.now() : new Date()

		const verifactuPayload: IInvoice = {
			id: currentCart.cart_id,
			invoiceNumber,
			issueDate: now.toISOString(),
			issuer: deps.issuer,
			totalAmount: pricing ? pricing.total : currentCart.total,
		}

		const { hash, qrUrl, aeatStatus } = await deps.verifactu.submit(verifactuPayload)

		verifactuData = {
			invoice_number: invoiceNumber,
			invoice_type: invoiceType,
			qr_content: qrUrl,
			hash,
			aeat_status: aeatStatus,
		}
	}

	const updatedCart = await deps.sales.transaction(async tx => {
		let subtotal = currentCart.subtotal
		let total = currentCart.total
		let discountData: Record<string, unknown> = {}
		if (pricing) {
			subtotal = pricing.subtotal
			total = pricing.total
			discountData = {
				discount: pricing.totalDiscount,
				coupon_discount_amount: couponRule ? pricing.couponAmount : null,
				manual_discount_type: manualRule?.type ?? null,
				manual_discount_value: manualRule?.value ?? null,
				manual_discount_amount: manualRule ? pricing.manualAmount : null,
			}
		}

		if (pricedItems) {
			await tx.deleteCartItems(id)

			const newItems = pricedItems.map(item => {
				const itemSubtotal = Number((item.quantity * item.unit_price).toFixed(2))
				const itemTotal = itemSubtotal

				return {
					cart_id: id,
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

			await tx.createCartItems(newItems)

			// Provision a ClientPackage for each NEWLY added bono/paquete line
			const provisionUserId = (input.user_id as string | undefined) ?? currentCart.user_id
			const countPkg = (items: IncomingLineItem[]) => {
				const m = new Map<string, number>()
				for (const it of items || []) {
					if ((it.item_type || '').toLowerCase() === 'package_sale') {
						m.set(it.item_id, (m.get(it.item_id) || 0) + (Number(it.quantity) || 1))
					}
				}
				return m
			}
			const prevPkg = countPkg((currentCart.items || []) as IncomingLineItem[])
			const nextPkg = countPkg(pricedItems as unknown as IncomingLineItem[])
			if (provisionUserId) {
				for (const [pkgId, nextCount] of nextPkg) {
					const toCreate = nextCount - (prevPkg.get(pkgId) || 0)
					if (toCreate <= 0) continue
					const catalogPkg = await tx.findCatalogPackage(pkgId)
					if (!catalogPkg) continue
					const totalServiceSessions = catalogPkg.type === 'MIXTO' && catalogPkg.items?.length
						? catalogPkg.items.filter(i => i.item_type === 'SERVICE').reduce((s, i) => s + (i.quantity || 0), 0)
						: catalogPkg.total_sessions
					const expiryDate = deps.now ? deps.now() : new Date()
					expiryDate.setMonth(expiryDate.getMonth() + 6)
					for (let n = 0; n < toCreate; n++) {
						const cp = await tx.createClientPackage({
							user_id: provisionUserId,
							package_id: catalogPkg.package_id,
							total_sessions: totalServiceSessions,
							remaining_sessions: totalServiceSessions,
							expiry_date: expiryDate,
							status: 'ACTIVE',
						})
						if (catalogPkg.items?.length) {
							await tx.createClientPackageItems(catalogPkg.items.map(i => ({
								client_package_id: cp.client_package_id,
								package_item_id: i.package_item_id,
								name: i.name,
								item_type: i.item_type,
								quantity_total: i.quantity,
								quantity_remaining: i.quantity,
								duration: i.duration,
							})))
						}
					}
				}
			}
		}

		const updateData: Record<string, unknown> = {
			user_id: input.user_id,
			status: input.status,
			...paymentData,
			notes: input.notes,
			subtotal,
			total,
			...discountData,
			...verifactuData,
		}

		if (input.created_at) {
			updateData.created_at = new Date(input.created_at as string)
		} else if (input.status === 'completed' && currentCart.status !== 'completed') {
			updateData.created_at = deps.now ? deps.now() : new Date()
		}

		const cart = await tx.updateCart(id, updateData)

		// Update associated debts if total changed
		if (cart.debts && cart.debts.length > 0 && repriced) {
			for (const debt of cart.debts) {
				const paidAmount = Number((debt.amount - debt.remaining).toFixed(2))
				const newRemaining = Number((cart.total - paidAmount).toFixed(2))

				await tx.updateDebt(debt.debt_id, {
					amount: cart.total,
					remaining: newRemaining > 0 ? newRemaining : 0,
					status: newRemaining <= 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'pending',
				})
			}
		}

		return cart
	})

	return updatedCart
}

