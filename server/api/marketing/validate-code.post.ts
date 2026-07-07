import { prisma } from '../../utils/prisma'

export default defineEventHandler(async event => {
	const body = await readBody(event)
	const { code, cartTotal } = body

	if (!code) {
		throw createError({ statusCode: 400, statusMessage: 'Código no proporcionado' })
	}

	try {
		// First check if it's a Coupon
		const coupon = await prisma.coupon.findUnique({
			where: { code }
		})

		if (coupon) {
			if (coupon.status !== 'active') {
				throw createError({ statusCode: 400, statusMessage: 'El cupón no está activo' })
			}
			if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
				throw createError({ statusCode: 400, statusMessage: 'El cupón ha expirado' })
			}
			if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
				throw createError({ statusCode: 400, statusMessage: 'El cupón ha alcanzado su límite de usos' })
			}
			if (coupon.min_purchase && cartTotal < coupon.min_purchase) {
				throw createError({ statusCode: 400, statusMessage: `Compra mínima requerida: ${coupon.min_purchase}€` })
			}

			// Calculate discount
			let discountAmount = 0
			if (coupon.discount_type === 'PERCENTAGE') {
				discountAmount = Number(((cartTotal * coupon.discount_value) / 100).toFixed(2))
			} else {
				discountAmount = coupon.discount_value
			}

			// Ensure we don't discount more than the cart total
			if (discountAmount > cartTotal) {
				discountAmount = cartTotal
			}

			return {
				valid: true,
				type: 'coupon',
				code: coupon.code,
				discountAmount,
				message: 'Cupón aplicado correctamente'
			}
		}

		// If not a coupon, check if it's a Giftcard
		const giftcard = await prisma.giftcard.findUnique({
			where: { code },
			include: { items: true } // Fetch services if any
		})

		if (giftcard) {
			if (giftcard.status !== 'active') {
				throw createError({ statusCode: 400, statusMessage: 'La tarjeta regalo no está activa' })
			}
			if (giftcard.expiration_date && new Date(giftcard.expiration_date) < new Date()) {
				throw createError({ statusCode: 400, statusMessage: 'La tarjeta regalo ha expirado' })
			}
			if (giftcard.current_balance <= 0 && giftcard.items.every(i => i.used >= i.quantity)) {
				throw createError({ statusCode: 400, statusMessage: 'La tarjeta regalo no tiene saldo ni servicios disponibles' })
			}

			// The frontend will calculate the discount based on the balance and matching items
			return {
				valid: true,
				type: 'giftcard',
				code: giftcard.code,
				balance: giftcard.current_balance,
				items: giftcard.items,
				message: 'Tarjeta Regalo válida'
			}
		}

		throw createError({ statusCode: 404, statusMessage: 'Código promocional no encontrado' })

	} catch (error: any) {
		if (error.statusCode) throw error
		throw createError({
			statusCode: 500,
			statusMessage: 'Error al validar el código',
		})
	}
})
