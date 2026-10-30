import { prisma } from '../../../utils/prisma'
import { z } from 'zod'
import { requireAdmin } from '../../../utils/auth'
import { generateInvoiceNumber, processVerifactuInvoice } from '../../../utils/verifactu'
import { payDebt } from '../../../modules/debts/pay-debt'
import { createPrismaDebtsRepository } from '../../../modules/debts/prisma-debts-repository'

const paymentSchema = z.object({
	amount: z.number().finite().positive('El importe debe ser mayor a 0'),
	payment_method: z.string().trim().min(1).max(30).default('transfer'),
	// Split of a "mixed" payment; it must add up to the amount actually paid
	payment_breakdown: z.unknown().optional(),
	notes: z.string().max(2000).optional(),
})

export default defineEventHandler(async event => {
	try {
		requireAdmin(event)
		const debtId = getRouterParam(event, 'id')
		if (!debtId) {
			throw createError({ statusCode: 400, statusMessage: 'ID de la deuda requerido' })
		}

		const body = await readBody(event)
		const parsedBody = paymentSchema.parse(body)
		const { amount, payment_method, payment_breakdown, notes } = parsedBody

		const config = useRuntimeConfig()

		return await payDebt(
			{
				debts: createPrismaDebtsRepository(prisma),
				verifactu: { generateInvoiceNumber, submit: processVerifactuInvoice },
				issuer: { nif: config.salonNif, name: config.salonName },
				now: () => new Date(),
			},
			{ debtId, amount, paymentMethod: payment_method, paymentBreakdown: payment_breakdown, notes },
		)
	} catch (rawError) {
		const error = toApiError(rawError)
		if (error instanceof z.ZodError) {
			throw createError({ statusCode: 400, statusMessage: error.message })
		}
		throw createError({
			statusCode: error.statusCode || 500,
			statusMessage: error.statusMessage || String(error),
			data: error.data,
		})
	}
})
