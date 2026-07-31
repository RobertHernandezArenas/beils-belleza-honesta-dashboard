
export interface IGiftcard {
	giftcard_id: string
	code: string
	initial_balance: number
	current_balance: number
	issue_date: string | Date
	expiration_date: string | Date | null
	status: 'active' | 'used' | 'expired'
	client_id: string | null
	created_at: string | Date
	updated_at: string | Date
}

export interface ICoupon {
	coupon_id: string
	code: string
	description: string | null
	discount_type: 'percentage' | 'fixed'
	discount_value: number
	min_purchase: number | null
	max_uses: number | null
	current_uses: number
	valid_from: string | Date | null
	valid_until: string | Date | null
	status: string
	created_at: string | Date
	updated_at: string | Date
}
