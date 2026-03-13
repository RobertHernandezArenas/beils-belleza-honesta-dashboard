import { defineEventHandler, createError } from 'h3'
import { prisma } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'
import { maskDocument } from '../../utils/privacy'

export default defineEventHandler(async event => {
	try {
		requireAdmin(event)

		const users = await prisma.user.findMany({
			orderBy: { created_at: 'desc' },
		})
		// Remove passwords from response and mask documents
		return users.map(u => {
			const { password, ...rest } = u
			return {
				...rest,
				document_number: maskDocument(u.document_number),
			}
		})
	} catch (error: any) {
		if (error.statusCode) throw error
		throw createError({
			statusCode: 500,
			statusMessage: 'Error al obtener usuarios',
		})
	}
})
