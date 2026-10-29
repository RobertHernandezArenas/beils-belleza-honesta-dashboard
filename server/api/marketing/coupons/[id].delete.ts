import { prisma } from '../../../utils/prisma'
import { requireAdmin } from '../../../utils/auth'
import { removeOrDeactivateCoupon, asCouponTx } from '../../../utils/coupons'

// A coupon already used in sales is deactivated, not deleted (sales reference it)
export default defineEventHandler(async event => {
	requireAdmin(event)
	const id = getRouterParam(event, 'id')
	if (!id) throw createError({ statusCode: 400, statusMessage: 'ID del cupón requerido' })

	const result = await removeOrDeactivateCoupon(asCouponTx(prisma), id)
	return { success: true, ...result }
})
