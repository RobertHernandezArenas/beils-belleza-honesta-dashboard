import { prisma } from '../../../utils/prisma'
import { z } from 'zod'

const revokeUpdateSchema = z.object({
	reason: z.string().optional().nullable(),
	date_revoked: z.string().optional(),
})

export default defineEventHandler(async event => {
	try {
		const id = getRouterParam(event, 'id')
		if (!id) {
			throw createError({ statusCode: 400, statusMessage: 'ID requerido' })
		}

		const body = await readBody(event)
		const parsedData = revokeUpdateSchema.parse(body)

		const updateData: any = { ...parsedData }
		if (parsedData.date_revoked) {
			updateData.date_revoked = new Date(parsedData.date_revoked)
		}

		const revoke = await prisma.revoke.update({
			where: { revoke_id: id },
			data: updateData,
			include: {
				user: {
					select: { user_id: true, name: true, surname: true, email: true },
				},
			},
		})

		return revoke
	} catch (error: any) {
		if (error.code === 'P2025') {
			throw createError({ statusCode: 404, statusMessage: 'Revocación no encontrada' })
		}
		if (error.statusCode) throw error
		throw createError({
			statusCode: 400,
			statusMessage: error.message || 'Datos inválidos o error al actualizar revocación',
		})
	}
})
