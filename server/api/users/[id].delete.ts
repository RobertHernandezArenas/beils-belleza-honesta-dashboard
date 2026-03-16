import { prisma } from '../../utils/prisma'

export default defineEventHandler(async event => {
	const id = event.context.params?.id
	if (!id) throw createError({ statusCode: 400, statusMessage: 'ID requerido' })

	try {
		await prisma.user.delete({
			where: { user_id: id },
		})
		return { success: true, message: 'Usuario eliminado' }
	} catch (error) {
		throw createError({
			statusCode: 500,
			statusMessage: 'Error al eliminar usuario',
		})
	}
})
