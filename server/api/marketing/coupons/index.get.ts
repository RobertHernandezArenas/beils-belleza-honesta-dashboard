import { prisma } from '../../../utils/prisma'
import { listCoupons } from '../../../modules/coupons/list-coupons'
import { createPrismaCouponsRepository } from '../../../modules/coupons/prisma-coupons-repository'

// Admins see every coupon; other staff (the TPV) only the ones usable right now
export default defineEventHandler(async event => {
	const query = getQuery(event)
	const search = typeof query.search === 'string' ? query.search.trim() : ''
	const onlyUsable = query.active === '1' || event.context.user?.role !== 'ADMIN'

	return await listCoupons(
		{ coupons: createPrismaCouponsRepository(prisma) },
		{ search, onlyUsable, now: new Date() },
	)
})
