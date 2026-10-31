import { createError } from 'h3'
import { assertCouponRules } from '../../utils/coupons'
import type { CouponsRepository, UpdateCouponInput, CouponRecord } from './ports'

export interface UpdateCouponDeps {
	coupons: CouponsRepository
}

export async function updateCoupon(
	deps: UpdateCouponDeps,
	{ id, data }: { id: string; data: UpdateCouponInput },
): Promise<CouponRecord> {
	const current = await deps.coupons.findById(id)
	if (!current) {
		throw createError({ statusCode: 404, statusMessage: 'Cupón no encontrado' })
	}

	assertCouponRules({ ...current, ...data })

	try {
		return await deps.coupons.update(id, data)
	} catch (rawError) {
		if ((rawError as { code?: string }).code === 'P2002') {
			throw createError({ statusCode: 409, statusMessage: 'Ya existe un cupón con ese código' })
		}
		throw rawError
	}
}

