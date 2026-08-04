// Client-facing DTOs: the JSON shapes the API actually returns.
// Mirror the Prisma models but with dates serialized to strings and Prisma
// Float -> number. Relations are optional (present only when the endpoint
// includes them). Kept permissive on purpose so UI code can consume partial
// payloads without fighting the type system.

export interface Client {
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
	client?: Partial<Client> | null
	staff?: Partial<Client> | null
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
	user?: Partial<Client> | null
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
