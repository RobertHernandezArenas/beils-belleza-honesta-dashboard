import { prisma } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'
import { assertCanDeleteUser } from '../../utils/user-admin'

export default defineEventHandler(async event => {
	const actor = requireAdmin(event)
	const id = event.context.params?.id
	if (!id) throw createError({ statusCode: 400, statusMessage: 'ID requerido' })

	try {
		const target = await prisma.user.findUnique({ where: { user_id: id }, select: { user_id: true, role: true } })
		if (!target) throw createError({ statusCode: 404, statusMessage: 'Usuario no encontrado' })

		const activeAdmins = await prisma.user.count({ where: { role: 'ADMIN', status: 'ON' } })
		assertCanDeleteUser({ actorId: actor.userId, target, activeAdmins })

		await prisma.user.delete({
			where: { user_id: id },
		})
		return { success: true, message: 'Usuario eliminado' }
	} catch (rawError) {
		const error = toApiError(rawError)
		if (error.statusCode) throw error
		console.error('Error deleting user:', error)
		throw createError({
			statusCode: 500,
			statusMessage: 'Error al eliminar usuario',
		})
	}
})
