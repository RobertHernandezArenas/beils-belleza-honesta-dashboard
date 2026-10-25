import { prisma } from '../../utils/prisma'
import { parseCatalogPackage, catalogPackageSessions } from '../../utils/package-validation'

export default defineEventHandler(async (event) => {
	try {
		const input = parseCatalogPackage(await readBody(event))
		const { name, description, type, price, service_id, items } = input
		const calculatedSessions = catalogPackageSessions(input)

		const pkg = await prisma.package.create({
			data: {
				name,
				description,
				type,
				price,
				total_sessions: calculatedSessions,
				service_id,
				status: 'activo',
				items: items && items.length > 0 ? { create: items } : undefined
			},
			include: {
				items: true
			}
		})

		return pkg
	} catch (rawError) {
		const error = toApiError(rawError)
		if (error.statusCode) throw error
		console.error('Error creating package:', error)
		throw createError({
			statusCode: 500,
			statusMessage: 'Error al crear el paquete'
		})
	}
})
