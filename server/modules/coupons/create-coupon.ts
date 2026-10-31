import { createError } from 'h3'
import type { CouponsRepository, NewCouponInput, CouponRecord } from './ports'

export interface CreateCouponDeps {
	coupons: CouponsRepository
}

export async function createCoupon(deps: CreateCouponDeps, input: NewCouponInput): Promise<CouponRecord> {
	try {
		return await deps.coupons.create(input)
	} catch (rawError) {
		if ((rawError as { code?: string }).code === 'P2002') {
			throw createError({ statusCode: 409, statusMessage: 'Ya existe un cupón con ese código' })
		}
		throw rawError
	}
}

