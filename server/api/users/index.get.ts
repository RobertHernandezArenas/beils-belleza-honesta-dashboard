import { prisma } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'
import { maskDocument } from '../../utils/privacy'

export default defineEventHandler(async event => {
	try {
		requireAdmin(event)

		const query = getQuery(event)
		const roles = query.roles ? (query.roles as string).split(',') : []

		const users = await prisma.user.findMany({
			where: roles.length > 0 ? {
				role: { in: roles as any }
			} : {},
			orderBy: { created_at: 'desc' },
			select: {
				user_id: true,
				name: true,
				surname: true,
				email: true,
				role: true,
				status: true,
				document_type: true,
				document_number: true,
				avatar: true,
			},
		})
		// Mask documents and return
		return users.map(u => ({
			...u,
			document_number: maskDocument(u.document_number),
		}))
	} catch (error: any) {
		if (error.statusCode) throw error
		throw createError({
			statusCode: 500,
			statusMessage: 'Error al obtener usuarios',
		})
	}
})
