import type { Prisma } from '@prisma/client'
import { prisma } from '../../../utils/prisma'
import { isCouponRedeemable } from '../../../utils/coupons'

// Admins see every coupon; other staff (the TPV) only the ones usable right now
export default defineEventHandler(async event => {
	const query = getQuery(event)
	const search = typeof query.search === 'string' ? query.search.trim() : ''
	const onlyUsable = query.active === '1' || event.context.user?.role !== 'ADMIN'

	const where: Prisma.CouponWhereInput = {}
	if (search) where.code = { contains: search.toUpperCase() }
	if (onlyUsable) where.status = 'activo'

	const coupons = await prisma.coupon.findMany({ where, orderBy: { created_at: 'desc' } })
	if (!onlyUsable) return coupons

	const now = new Date()
	return coupons.filter(coupon => isCouponRedeemable(coupon, now))
})
