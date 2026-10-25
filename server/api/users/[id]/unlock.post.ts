import { prisma } from '../../../utils/prisma'
import { requireAdmin } from '../../../utils/auth'

/** Clears a login lockout (3 failed attempts) so the user can sign in again right away. */
export default defineEventHandler(async event => {
	requireAdmin(event)
	const id = getRouterParam(event, 'id')
	if (!id) throw createError({ statusCode: 400, statusMessage: 'ID requerido' })

	const { count } = await prisma.user.updateMany({
		where: { user_id: id },
		data: { failed_login_count: 0, locked_until: null },
	})
	if (count === 0) throw createError({ statusCode: 404, statusMessage: 'Usuario no encontrado' })

	return { success: true }
})
