import { prisma } from '../../../utils/prisma'
import { requireAdmin } from '../../../utils/auth'
import { parseCouponCreate } from '../../../utils/coupons'

export default defineEventHandler(async event => {
	requireAdmin(event)
	// Allow-listed fields only: usage counters and timestamps are never client-set
	const data = parseCouponCreate(await readBody(event))
	try {
		return await prisma.coupon.create({ data })
	} catch (rawError) {
		if ((rawError as { code?: string }).code === 'P2002') {
			throw createError({ statusCode: 409, statusMessage: 'Ya existe un cupón con ese código' })
		}
		throw rawError
	}
})
