import type { Prisma, PrismaClient } from '@prisma/client'
import type { CouponsRepository, CouponRecord, NewCouponInput, UpdateCouponInput, FindManyCouponsArgs } from './ports'
import { removeOrDeactivateCoupon, asCouponTx } from '../../utils/coupons'

export function createPrismaCouponsRepository(db: PrismaClient): CouponsRepository {
	return {
		async findMany({ search, onlyUsable }: FindManyCouponsArgs) {
			const where: Prisma.CouponWhereInput = {}
			if (search) where.code = { contains: search.toUpperCase() }
			if (onlyUsable) where.status = 'activo'

			return (await db.coupon.findMany({ where, orderBy: { created_at: 'desc' } })) as CouponRecord[]
		},

		async findById(id: string) {
			return (await db.coupon.findUnique({ where: { coupon_id: id } })) as CouponRecord | null
		},

		async findByCode(code: string) {
			return (await db.coupon.findUnique({ where: { code } })) as CouponRecord | null
		},

		async create(data: NewCouponInput) {
			return (await db.coupon.create({ data })) as CouponRecord
		},

		async update(id: string, data: UpdateCouponInput) {
			return (await db.coupon.update({ where: { coupon_id: id }, data })) as CouponRecord
		},

		async deleteOrDeactivate(id: string) {
			return await removeOrDeactivateCoupon(asCouponTx(db), id)
		},
	} satisfies CouponsRepository
}

