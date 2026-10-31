import type { CouponsRepository } from './ports'

export interface DeleteCouponDeps {
	coupons: CouponsRepository
}

export async function deleteCoupon(
	deps: DeleteCouponDeps,
	{ id }: { id: string },
): Promise<{ success: true; deleted: boolean; deactivated: boolean }> {
	const result = await deps.coupons.deleteOrDeactivate(id)
	return { success: true, ...result }
}

