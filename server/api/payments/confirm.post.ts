import { defineEventHandler, readBody, createError } from 'h3'
import { stripe } from '../../utils/stripe'
import { z } from 'zod'
import {
	generateInvoiceNumber,
	processVerifactuInvoice,
} from '../../utils/verifactu'
import type { IInvoice } from '~~/shared/types/invoice'

const confirmSchema = z.object({
	payment_intent_id: z.string().min(1, 'PaymentIntent ID es obligatorio'),
	cart_id: z.string().min(1, 'Cart ID es obligatorio'),
})

export default defineEventHandler(async event => {
	try {
		const body = await readBody(event)
		const { payment_intent_id, cart_id } = confirmSchema.parse(body)

		// Verificar estado del PaymentIntent
		const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id)

		if (paymentIntent.status !== 'succeeded') {
			// Actualizar estado en BD
			await prisma.cart.update({
				where: { cart_id },
				data: {
					stripe_status: paymentIntent.status,
				},
			})

			return {
				success: false,
				status: paymentIntent.status,
				message: `El pago no se ha completado. Estado: ${paymentIntent.status}`,
			}
		}

		// Pago exitoso → completar carrito + VeriFactu
		const currentCart = await prisma.cart.findUnique({
			where: { cart_id },
			include: { user: { select: { document_number: true } } },
		})

		if (!currentCart) {
			throw createError({ statusCode: 404, statusMessage: 'Carrito no encontrado' })
		}

		let verifactuData: any = {}

		if (!currentCart.invoice_number) {
			const config = useRuntimeConfig()
			const nif = currentCart.user?.document_number || '00000000T'
			const invoiceType = currentCart.user?.document_number ? 'F1' : 'I' // Simplified

			const invoiceNumber = await generateInvoiceNumber(invoiceType as 'F1' | 'I')
			
			const verifactuPayload: IInvoice = {
				id: currentCart.cart_id,
				invoiceNumber,
				issueDate: new Date().toISOString(),
				issuer: {
					nif: config.salonNif,
					name: config.salonName
				},
				totalAmount: currentCart.total
			}

			const { hash, qrUrl, aeatStatus } = await processVerifactuInvoice(verifactuPayload)

			verifactuData = {
				invoice_number: invoiceNumber,
				invoice_type: invoiceType,
				qr_content: qrUrl,
				hash: hash,
				aeat_status: aeatStatus,
			}
		}

		const isInstallment = currentCart.stripe_installments && currentCart.stripe_installments > 1;
		const finalStatus = isInstallment ? 'pending_installments' : 'completed';

		const updatedCart = await prisma.cart.update({
			where: { cart_id },
			data: {
				status: finalStatus,
				stripe_status: 'succeeded',
				payment_method: 'stripe',
				...verifactuData,
			},
			include: {
				items: true,
				user: { select: { name: true, surname: true } },
			},
		})

		// Si es pago fraccionado, crear la deuda
		if (isInstallment) {
			const installmentsCount = currentCart.stripe_installments!
			// Asumimos que la primera cuota se ha cobrado en este PaymentIntent
			const firstPayment = currentCart.total / installmentsCount
			const remainingAmount = currentCart.total - firstPayment

			await prisma.debt.create({
				data: {
					user_id: currentCart.user_id!,
					cart_id: currentCart.cart_id,
					amount: currentCart.total,
					remaining: remainingAmount,
					status: 'partial',
					notes: `Pago Fraccionado Stripe (${installmentsCount} cuotas)`,
				}
			})
		}

		return {
			success: true,
			status: 'succeeded',
			cart: updatedCart,
		}
	} catch (error: any) {
		if (error.statusCode) throw error
		throw createError({
			statusCode: 400,
			statusMessage: error.message || 'Error al confirmar el pago de Stripe',
		})
	}
})
