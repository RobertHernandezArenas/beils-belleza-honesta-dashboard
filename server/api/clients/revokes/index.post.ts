import { prisma } from '../../../utils/prisma'
import { z } from 'zod'

const revokeSchema = z.object({
	user_id: z.string().min(1, 'El cliente es obligatorio'),
	reason: z.string().optional(),
	date_revoked: z.string().optional(),
})

export default defineEventHandler(async event => {
	try {
		const body = await readBody(event)
		const parsedData = revokeSchema.parse(body)

		const revoke = await prisma.revoke.create({
			data: {
				...parsedData,
				date_revoked: parsedData.date_revoked ? new Date(parsedData.date_revoked) : new Date(),
			},
			include: {
				user: {
					select: { user_id: true, name: true, surname: true, email: true },
				},
			},
		})

		return revoke
	} catch (error: any) {
		if (error.statusCode) throw error
		throw createError({
			statusCode: 400,
			statusMessage: error.message || 'Datos inválidos o error al crear revocación',
		})
	}
})
