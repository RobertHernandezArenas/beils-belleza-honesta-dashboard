// Shape of a line item as it arrives in an untyped request body (readBody),
// before it's persisted as a CartItem / BookingItem / PackageItem. All fields
// are optional because the client may omit them; handlers apply defaults.
export interface IncomingLineItem {
	// Required: the DB columns (CartItem/PackageItem) are non-null and every
	// handler that maps these already assumes they're present.
	item_id: string
	name: string
	quantity: number
	unit_price: number
	// Optional: handlers apply defaults for these ('SERVICE', 21.0, 30…).
	item_type?: string
	tax_rate?: number
	duration?: number
}
