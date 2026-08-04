// ClientDTO-facing DTOs: the JSON shapes the API actually returns.
// Mirror the Prisma models but with dates serialized to strings and Prisma
// Float -> number. Relations are optional (present only when the endpoint
// includes them). Kept permissive on purpose so UI code can consume partial
// payloads without fighting the type system.

export interface ClientDTO {
	user_id: string
	email: string
	name: string
	surname: string
	phone: string
	address?: string
	city?: string
	country?: string
	postal_code?: string
	gender?: string
	birth_date?: string
	role: string
	status: string
	avatar?: string
	document_type?: string
	document_number?: string
	annotations?: string | null
	created_at?: string
	updated_at?: string
}

export interface BookingItem {
	booking_item_id?: string
	booking_id?: string
	item_type: string
	item_id: string
	name: string
	duration: number
	remaining_sessions?: number
}

// Shape of an error thrown by $fetch/ofetch on the client: an H3/ofetch error
// carries `data.statusMessage` (from the server's createError) plus `message`.
export interface FetchError {
	data?: { statusMessage?: string }
	response?: { _data?: { statusMessage?: string } }
	message?: string
}

export interface Booking {
	booking_id: string
	client_id: string
	staff_id?: string | null
	item_type?: string
	item_id?: string
	status: string
	booking_date: string
	start_time: string
	end_time: string
	duration: number
	notes?: string | null
	booking_items?: BookingItem[]
	client?: Partial<ClientDTO> | null
	staff?: Partial<ClientDTO> | null
	created_at?: string
	updated_at?: string
}

export interface SaleItem {
	cart_item_id?: string
	cart_id?: string
	item_type: string
	item_id: string
	name: string
	quantity: number
	unit_price: number
	tax_rate: number
	subtotal: number
	total: number
}

export interface Sale {
	cart_id: string
	user_id?: string | null
	booking_id?: string | null
	status: string
	subtotal: number
	discount: number
	total: number
	payment_method?: string | null
	notes?: string | null
	invoice_number?: string | null
	invoice_type?: string | null
	aeat_status?: string
	created_at: string
	updated_at?: string
	items?: SaleItem[]
	user?: Partial<ClientDTO> | null
	debts?: unknown[]
}

export interface ClientPackageItem {
	client_package_item_id?: string
	client_package_id?: string
	package_item_id?: string
	name: string
	item_type: string
	quantity_total: number
	quantity_remaining: number
	duration: number
}

// Permissive shape for a catalog row as consumed by the TPV/purchase UIs,
// where products, services and packages are handled polymorphically (each has
// its own *_id). Fields are optional so a single handler can accept any of them.
export interface CatalogItem {
	product_id?: string
	service_id?: string
	package_id?: string
	client_package_id?: string
	// Present when the catalog row has been normalised for a cart/search flow.
	item_id?: string
	item_type?: string
	name: string
	price?: number
	tax_rate?: number
	sku?: string | null
	code?: string | null
	remaining_sessions?: number
}

export interface ClientPackage {
	client_package_id: string
	user_id: string
	package_id: string
	total_sessions: number
	remaining_sessions: number
	expiry_date?: string | null
	status: string
	items?: ClientPackageItem[]
}

export interface DebtPayment {
	payment_id: string
	debt_id: string
	amount: number
	payment_method: string
	payment_date: string
	notes?: string | null
}

export interface Debt {
	debt_id: string
	user_id: string
	cart_id?: string | null
	amount: number
	remaining: number
	status: string
	due_date?: string | null
	notes?: string | null
	created_at?: string
	payments?: DebtPayment[]
	cart?: Sale | null
}

export interface Questionnaire {
	questionnaire_id: string
	user_id: string
	title: string
	data: string
	created_at?: string
	user?: Partial<ClientDTO> | null
}

export interface Consent {
	consent_id: string
	user_id?: string | null
	consent_type?: string | null
	status: string
	signed_date: string
	document_url?: string | null
	notes?: string | null
	created_at?: string | null
	user?: Partial<ClientDTO> | null
}

export interface Revoke {
	revoke_id: string
	user_id: string
	reason?: string | null
	date_revoked: string
	created_at?: string
	user?: Partial<ClientDTO> | null
}

// A ClientDTO together with the relations the profile screens load. Everything is
// optional because different endpoints hydrate different slices.
export interface ClientProfile extends ClientDTO {
	carts?: Sale[]
	debts?: Debt[]
	questionnaires?: Questionnaire[]
	consents?: Consent[]
	revokes?: Revoke[]
	client_packages?: ClientPackage[]
	bookings?: Booking[]
}
