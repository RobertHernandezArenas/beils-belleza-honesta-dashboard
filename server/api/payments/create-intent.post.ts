import { stripe } from '../../utils/stripe'
import { z } from 'zod'

const createIntentSchema = z.object({
	amount: z.number().min(0.5, 'El importe mínimo es 0.50€'),
	installments: z.number().refine(val => [1, 3, 4, 6].includes(val), {
		message: 'Las cuotas disponibles son: 1, 3, 4, 6',
	}),
	cart_id: z.string().optional(),
	description: z.string().optional(),
	items: z.array(
		z.object({
			name: z.string(),
			unit_price: z.number(),
			quantity: z.number(),
		})
	).optional()
})

export default defineEventHandler(async event => {
	try {
		const body = await readBody(event)
		const { amount, installments, cart_id, description, items } = createIntentSchema.parse(body)

		// Construir line_items
		let lineItems: any[] = []
		if (items && items.length > 0) {
			lineItems = items.map(item => ({
				price_data: {
					currency: 'eur',
					product_data: {
						name: item.name,
					},
					unit_amount: Math.round(item.unit_price * 100),
				},
				quantity: item.quantity,
			}))
		} else {
			// Fallback genérico si no hay items
			lineItems = [
				{
					price_data: {
						currency: 'eur',
						product_data: {
							name: description || 'Pago Total Beils',
						},
						unit_amount: Math.round(amount * 100),
					},
					quantity: 1,
				},
			]
		}

		// Crear Checkout Session
		const sessionData: any = {
			payment_method_types: ['card'],
			line_items: lineItems,
			mode: 'payment',
			metadata: {
				cart_id: cart_id || '',
				installments: String(installments),
				source: 'beils_tpv',
			},
			success_url: 'http://localhost:3000/tpv?stripe_success=true',
			cancel_url: 'http://localhost:3000/tpv?stripe_cancel=true',
		}

		// Configurar plan de cuotas si > 1
		if (installments > 1) {
			sessionData.payment_method_options = {
				card: {
					installments: {
						enabled: true,
					},
				},
			}
		}

		const session = await stripe.checkout.sessions.create(sessionData)

		// Si hay cart_id, actualizar el carrito (aunque el carrito se creará DEPUÉS en el frontend)
		if (cart_id) {
			await prisma.cart.update({
				where: { cart_id },
				data: {
					stripe_payment_intent_id: session.payment_intent as string || null,
					stripe_installments: installments,
					stripe_status: 'checkout_session_created',
					payment_method: 'stripe',
				},
			})
		}

		return {
			url: session.url,
			paymentIntentId: session.payment_intent || session.id, // Fallback en caso de necesitar ID
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
