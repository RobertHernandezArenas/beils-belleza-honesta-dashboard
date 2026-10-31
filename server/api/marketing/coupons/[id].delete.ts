import { prisma } from '../../../utils/prisma'
import { requireAdmin } from '../../../utils/auth'
import { deleteCoupon } from '../../../modules/coupons/delete-coupon'
import { createPrismaCouponsRepository } from '../../../modules/coupons/prisma-coupons-repository'

// A coupon already used in sales is deactivated, not deleted (sales reference it)
export default defineEventHandler(async event => {
	requireAdmin(event)
	const id = getRouterParam(event, 'id')
	if (!id) throw createError({ statusCode: 400, statusMessage: 'ID del cupón requerido' })

	return await deleteCoupon(
		{ coupons: createPrismaCouponsRepository(prisma) },
		{ id },
	)
})
