import type { CouponRow } from '../../utils/coupons'

export interface CouponRecord extends CouponRow {
	description?: string | null
	created_at?: Date
	updated_at?: Date
}

export type NewCouponInput = {
	code: string
	description?: string | null
	discount_type: 'fixed' | 'percentage'
	discount_value: number
	min_purchase?: number | null
	max_uses?: number | null
	valid_from?: Date | null
	valid_until?: Date | null
	status?: 'activo' | 'inactivo'
}

export type UpdateCouponInput = Partial<NewCouponInput>

export interface FindManyCouponsArgs {
	search?: string
	onlyUsable?: boolean
}

export interface CouponsRepository {
	findMany(args: FindManyCouponsArgs): Promise<CouponRecord[]>
	findById(id: string): Promise<CouponRecord | null>
	findByCode(code: string): Promise<CouponRecord | null>
	create(data: NewCouponInput): Promise<CouponRecord>
	update(id: string, data: UpdateCouponInput): Promise<CouponRecord>
	deleteOrDeactivate(id: string): Promise<{ deleted: boolean; deactivated: boolean }>
}

