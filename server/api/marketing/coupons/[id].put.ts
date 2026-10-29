import { prisma } from '../../../utils/prisma'
import { requireAdmin } from '../../../utils/auth'
import { parseCouponUpdate, assertCouponRules } from '../../../utils/coupons'

// Sales keep their own snapshot of the coupon, so editing it never changes past sales
export default defineEventHandler(async event => {
	requireAdmin(event)
	const id = getRouterParam(event, 'id')
	if (!id) throw createError({ statusCode: 400, statusMessage: 'ID del cupón requerido' })

	const data = parseCouponUpdate(await readBody(event))
	const current = await prisma.coupon.findUnique({ where: { coupon_id: id } })
	if (!current) throw createError({ statusCode: 404, statusMessage: 'Cupón no encontrado' })
	assertCouponRules({ ...current, ...data })

	try {
		return await prisma.coupon.update({ where: { coupon_id: id }, data })
	} catch (rawError) {
		if ((rawError as { code?: string }).code === 'P2002') {
			throw createError({ statusCode: 409, statusMessage: 'Ya existe un cupón con ese código' })
		}
		throw rawError
	}
})
