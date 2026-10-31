import { prisma } from '../../../utils/prisma'
import { requireAdmin } from '../../../utils/auth'
import { parseCouponUpdate } from '../../../utils/coupons'
import { updateCoupon } from '../../../modules/coupons/update-coupon'
import { createPrismaCouponsRepository } from '../../../modules/coupons/prisma-coupons-repository'

// Sales keep their own snapshot of the coupon, so editing it never changes past sales
export default defineEventHandler(async event => {
	requireAdmin(event)
	const id = getRouterParam(event, 'id')
	if (!id) throw createError({ statusCode: 400, statusMessage: 'ID del cupón requerido' })

	const data = parseCouponUpdate(await readBody(event))

	return await updateCoupon(
		{ coupons: createPrismaCouponsRepository(prisma) },
		{ id, data },
	)
})
