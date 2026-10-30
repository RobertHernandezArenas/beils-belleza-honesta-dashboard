import type { CouponTx } from '../../utils/coupons'
import type { ConsumptionTx } from '../../utils/package-consumption'
import type { SaleCatalog, SaleLineInput } from '../../utils/sale-pricing'
import type { CartInvoiceStore, InvoiceType } from '../shared/invoicing'

/** What the sale use case needs from storage. Plain TypeScript: no Prisma, no h3. */

export interface NewCartItem {
	item_type: string
	item_id: string
	name: string
	quantity: number
	unit_price: number
	tax_rate: number
	subtotal: number
	total: number
}

export interface NewCart {
	user_id: string | null
	booking_id: string | null
	status: string
	payment_method: string
	payment_breakdown: string | null
	notes: string | undefined
	subtotal: number
	discount: number
	total: number
	coupon_id: string | null
	coupon_code: string | null
	coupon_discount_type: string | null
	coupon_discount_value: number | null
	coupon_discount_amount: number | null
	manual_discount_type: string | null
	manual_discount_value: number | null
	manual_discount_amount: number | null
	items: NewCartItem[]
}

export interface CreatedCart {
	cart_id: string
	user_id: string | null
	status: string
	total: number
}

export interface NewDebt {
	user_id: string
	cart_id: string
	amount: number
	remaining: number
	status: string
}

export interface CatalogPackage {
	package_id: string
	type: string | null
	total_sessions: number
	items?: {
		package_item_id: string
		name: string
		item_type: string
		quantity: number
		duration: number
	}[]
}

export interface OwnPackageQuery {
	userId: string
	itemId: string
	cleanName: string
	qty: number
	now: Date
}

/** Everything that must commit or roll back together with the sale. */
export interface SaleUnitOfWork {
	/** Narrow views handed to the shared coupon / bono-consumption helpers */
	couponTx: CouponTx
	consumptionTx: ConsumptionTx

	completeBooking(bookingId: string): Promise<unknown>
	findUnlinkedBookingAround(clientId: string, from: Date, to: Date): Promise<{ booking_id: string } | null>

	createCart(cart: NewCart): Promise<CreatedCart>
	createDebt(debt: NewDebt): Promise<unknown>

	findClientPackageItem(id: string): Promise<{ client_package_item_id: string } | null>
	findClientPackage(id: string): Promise<{ client_package_id: string } | null>
	findOwnUsablePackageItem(query: OwnPackageQuery): Promise<{ client_package_item_id: string } | null>
	findOwnUsablePackage(query: OwnPackageQuery): Promise<{ client_package_id: string } | null>

	findCatalogPackage(packageId: string): Promise<CatalogPackage | null>
	createClientPackage(data: {
		user_id: string
		package_id: string
		total_sessions: number
		remaining_sessions: number
		expiry_date: Date
		status: string
	}): Promise<{ client_package_id: string }>
	createClientPackageItems(data: {
		client_package_id: string
		package_item_id: string
		name: string
		item_type: string
		quantity_total: number
		quantity_remaining: number
		duration: number
	}[]): Promise<unknown>
}

export interface SalesRepository<TView = unknown> extends CartInvoiceStore {
	loadCatalog(lines: SaleLineInput[]): Promise<SaleCatalog>
	/** The callback commits only if it resolves; any throw rolls everything back */
	transaction<T>(work: (uow: SaleUnitOfWork) => Promise<T>): Promise<T>
	findUserDocument(userId: string): Promise<InvoiceTypeSource | null>
	/** Final cart (items, user, debts) returned to the caller */
	findCartView(cartId: string): Promise<TView>
}

export interface InvoiceTypeSource {
	document_number: string | null
}

export type { InvoiceType }
