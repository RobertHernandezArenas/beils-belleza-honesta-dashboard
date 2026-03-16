import { prisma } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'

export default defineEventHandler(async event => {
	try {
		requireAdmin(event)
		const id = getRouterParam(event, 'id')
		if (!id) {
			throw createError({ statusCode: 400, statusMessage: 'ID requerido' })
		}

		// Verify if the client has unpayable debts or active bookings before deletion?
		// For now, cascade deletion will handle related consents/questionnaires etc.
		// It's usually safer just to mark as OFF, but standard CRM CRUD allows deletion.

		await prisma.user.delete({
			where: { user_id: id, role: 'CLIENT' },
		})

		return { success: true }
	} catch (error: any) {
		if (error.code === 'P2025') {
			throw createError({ statusCode: 404, statusMessage: 'Cliente no encontrado' })
		}
		throw createError({
			statusCode: 500,
			statusMessage: 'Error al eliminar cliente',
		})
	}
})
