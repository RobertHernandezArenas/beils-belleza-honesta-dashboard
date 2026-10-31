import { prisma } from '../../../utils/prisma'
import { requireAdmin } from '../../../utils/auth'
import { parseCouponCreate } from '../../../utils/coupons'
import { createCoupon } from '../../../modules/coupons/create-coupon'
import { createPrismaCouponsRepository } from '../../../modules/coupons/prisma-coupons-repository'

export default defineEventHandler(async event => {
	requireAdmin(event)
	// Allow-listed fields only: usage counters and timestamps are never client-set
	const data = parseCouponCreate(await readBody(event))

	return await createCoupon(
		{ coupons: createPrismaCouponsRepository(prisma) },
		data,
	)
})
