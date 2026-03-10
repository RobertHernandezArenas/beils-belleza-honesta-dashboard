import { defineEventHandler, readBody, createError } from 'h3'
import { stripe } from '../../utils/stripe'
import { z } from 'zod'

const createIntentSchema = z.object({
	amount: z.number().min(0.5, 'El importe mínimo es 0.50€'),
	installments: z.number().refine(val => [1, 3, 4, 6].includes(val), {
		message: 'Las cuotas disponibles son: 1, 3, 4, 6',
	}),
	cart_id: z.string().optional(),
	description: z.string().optional(),
})

export default defineEventHandler(async event => {
	try {
		const body = await readBody(event)
		const { amount, installments, cart_id, description } = createIntentSchema.parse(body)

		// Stripe usa céntimos como unidad
		const amountInCents = Math.round(amount * 100)

		const paymentIntentData: any = {
			amount: amountInCents,
			currency: 'eur',
			description: description || `Pago Beils — ${installments} cuota(s)`,
			metadata: {
				cart_id: cart_id || '',
				installments: String(installments),
				source: 'beils_tpv',
			},
		}

		// Configurar plan de cuotas si > 1
		if (installments > 1) {
			paymentIntentData.payment_method_options = {
				card: {
					installments: {
						enabled: true,
					},
				},
			}
		}

		const paymentIntent = await stripe.paymentIntents.create(paymentIntentData)

		// Si hay cart_id, actualizar el carrito
		if (cart_id) {
			await prisma.cart.update({
				where: { cart_id },
				data: {
					stripe_payment_intent_id: paymentIntent.id,
					stripe_installments: installments,
					stripe_status: paymentIntent.status,
					payment_method: 'stripe',
				},
			})
		}

		return {
			clientSecret: paymentIntent.client_secret,
			paymentIntentId: paymentIntent.id,
			amount: amount,
			installments: installments,
			amountPerInstallment: Number((amount / installments).toFixed(2)),
		}
	} catch (error: any) {
		if (error.statusCode) throw error
		throw createError({
			statusCode: 400,
			statusMessage: error.message || 'Error al crear el intento de pago de Stripe',
		})
	}
})
