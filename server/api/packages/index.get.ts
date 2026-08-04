import { prisma } from '../../utils/prisma'

export default defineEventHandler(async () => {
	try {
		const packages = await prisma.package.findMany({
			where: { status: 'activo' },
			include: {
				items: true
			},
			orderBy: { created_at: 'desc' }
		})

		// Guarantee total_sessions for MIXTO only counts SERVICE items
		return packages.map(pkg => {
			if (pkg.type === 'MIXTO' && pkg.items && pkg.items.length > 0) {
				const serviceSessions = pkg.items
					.filter(it => it.item_type === 'SERVICE')
					.reduce((sum, it) => sum + (it.quantity || 0), 0)
				return { ...pkg, total_sessions: serviceSessions }
			}
			return pkg
		})
	} catch (rawError) {
		const error = toApiError(rawError)
		throw createError({
			statusCode: 500,
			statusMessage: error.message || 'Error al obtener paquetes'
		})
	}
})
