import { isCouponRedeemable } from '../../utils/coupons'
import type { CouponsRepository, CouponRecord } from './ports'

export interface ListCouponsDeps {
	coupons: CouponsRepository
}

export interface ListCouponsQuery {
	search?: string
	onlyUsable?: boolean
	now?: Date
}

export async function listCoupons(deps: ListCouponsDeps, query: ListCouponsQuery = {}): Promise<CouponRecord[]> {
	const coupons = await deps.coupons.findMany({
		search: query.search,
		onlyUsable: query.onlyUsable,
	})

	if (!query.onlyUsable) return coupons

	const now = query.now ?? new Date()
	return coupons.filter(coupon => isCouponRedeemable(coupon, now))
}

