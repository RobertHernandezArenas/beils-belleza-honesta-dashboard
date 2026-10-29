import { createError } from 'h3'
import { z } from 'zod'
import { parseOrBadRequest } from './validation'
import { normalizeDiscountKind, type DiscountRule } from '../../shared/utils/discounts'

/**
 * Discount coupons. One coupon per sale; the server always re-validates it and counts the use
 * inside the sale transaction with a conditional update, so a limited coupon can't be
 * over-redeemed by concurrent sales (a lost race fails the sale with 409 and rolls it back).
 */

export const COUPON_STATUSES = ['activo', 'inactivo'] as const

export interface CouponRow {
	coupon_id: string
	code: string
	discount_type: string
	discount_value: number
	min_purchase: number | null
	max_uses: number | null
	current_uses: number
	valid_from: Date | null
	valid_until: Date | null
	status: string
}

export const normalizeCouponCode = (code: string) => code.trim().toUpperCase()

const isoDate = z.iso
	.datetime({ offset: true, message: 'Fecha no válida' })
	.transform(value => new Date(value))
	.nullish()

const couponFields = z
	.object({
		code: z
			.string()
			.trim()
			.min(1, 'El código es obligatorio')
			.max(50, 'El código es demasiado largo')
			.regex(/^[A-Za-z0-9_-]+$/, 'El código solo admite letras, números, guiones y guiones bajos')
			.transform(normalizeCouponCode),
		description: z
			.string()
			.trim()
			.max(2000)
			.nullish()
			.transform(value => value || null),
		discount_type: z.preprocess(normalizeDiscountKind, z.enum(['fixed', 'percentage'], { message: 'Tipo de descuento no válido' })),
		discount_value: z.number({ message: 'Valor de descuento no válido' }).finite().positive('El descuento debe ser mayor que 0'),
		min_purchase: z.number().finite().min(0, 'La compra mínima no puede ser negativa').nullish(),
		max_uses: z.number().int('El límite de usos debe ser un número entero').min(1, 'El límite de usos debe ser al menos 1').nullish(),
		valid_from: isoDate,
		valid_until: isoDate,
		status: z.enum(COUPON_STATUSES, { message: 'Estado no válido' }).optional(),
	})
	.strict()

/** Cross-field rules, checked on the full coupon (also after merging a partial update). */
export function assertCouponRules(coupon: {
	discount_type?: string
	discount_value?: number
	valid_from?: Date | null
	valid_until?: Date | null
}) {
	if (normalizeDiscountKind(coupon.discount_type) === 'percentage' && (coupon.discount_value ?? 0) > 100) {
		throw createError({ statusCode: 400, statusMessage: 'Un descuento porcentual no puede superar el 100%' })
	}
	if (coupon.valid_from && coupon.valid_until && coupon.valid_until < coupon.valid_from) {
		throw createError({ statusCode: 400, statusMessage: 'La fecha de fin no puede ser anterior a la de inicio' })
	}
}

export function parseCouponCreate(body: unknown) {
	const data = parseOrBadRequest(couponFields, body)
	assertCouponRules(data)
	return data
}

export const parseCouponUpdate = (body: unknown) => parseOrBadRequest(couponFields.partial(), body)

/** Why the coupon can't be used right now (null = usable). `subtotal` adds the min-purchase check. */
export function couponRejection(coupon: CouponRow, { now, subtotal }: { now: Date; subtotal?: number }): string | null {
	if (coupon.status !== 'activo') return 'El cupón no está activo'
	if (!normalizeDiscountKind(coupon.discount_type) || !(coupon.discount_value > 0)) return 'El cupón no es válido'
	if (coupon.valid_from && now < coupon.valid_from) return 'El cupón todavía no es válido'
	if (coupon.valid_until && now > coupon.valid_until) return 'El cupón ha caducado'
	if (coupon.max_uses != null && coupon.current_uses >= coupon.max_uses) return 'El cupón ha alcanzado su límite de usos'
	if (subtotal !== undefined && coupon.min_purchase && subtotal < coupon.min_purchase) {
		return `El cupón requiere una compra mínima de ${coupon.min_purchase.toFixed(2)} €`
	}
	return null
}

export const isCouponRedeemable = (coupon: CouponRow, now: Date) => couponRejection(coupon, { now }) === null

export interface CouponTx {
	coupon: {
		findUnique(args: { where: { code: string } }): Promise<CouponRow | null>
		updateMany(args: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<{ count: number }>
		deleteMany(args: { where: Record<string, unknown> }): Promise<{ count: number }>
	}
}

export const asCouponTx = (tx: unknown) => tx as CouponTx

/** Validates the coupon for this sale and counts one use. Run inside the sale transaction. */
export async function redeemCouponForSale(
	tx: CouponTx,
	{ code, subtotal, now }: { code: string; subtotal: number; now: Date },
): Promise<{ coupon_id: string; code: string; rule: DiscountRule }> {
	const coupon = await tx.coupon.findUnique({ where: { code: normalizeCouponCode(code) } })
	if (!coupon) throw createError({ statusCode: 400, statusMessage: 'El cupón no existe' })

	const rejection = couponRejection(coupon, { now, subtotal })
	if (rejection) throw createError({ statusCode: 400, statusMessage: rejection })

	// Atomic: the row only changes if it's still active and (for limited coupons) below its limit
	const limitGuard = coupon.max_uses == null ? { max_uses: null } : { max_uses: coupon.max_uses, current_uses: { lt: coupon.max_uses } }
	const { count } = await tx.coupon.updateMany({
		where: { coupon_id: coupon.coupon_id, status: 'activo', ...limitGuard },
		data: { current_uses: { increment: 1 } },
	})
	if (count !== 1) {
		throw createError({
			statusCode: 409,
			statusMessage: 'El cupón se acaba de agotar o ha cambiado. Revisa el cupón y vuelve a intentarlo.',
		})
	}

	return {
		coupon_id: coupon.coupon_id,
		code: coupon.code,
		rule: { type: normalizeDiscountKind(coupon.discount_type)!, value: coupon.discount_value },
	}
}

/** A used coupon is referenced by sales, so it is deactivated instead of deleted. */
export async function removeOrDeactivateCoupon(tx: CouponTx, couponId: string) {
	// Conditional delete: a sale redeeming it concurrently makes this a deactivation instead
	const { count: deleted } = await tx.coupon.deleteMany({ where: { coupon_id: couponId, current_uses: 0 } })
	if (deleted === 1) return { deleted: true, deactivated: false }

	const { count: updated } = await tx.coupon.updateMany({ where: { coupon_id: couponId }, data: { status: 'inactivo' } })
	if (updated === 0) throw createError({ statusCode: 404, statusMessage: 'Cupón no encontrado' })
	return { deleted: false, deactivated: true }
}
