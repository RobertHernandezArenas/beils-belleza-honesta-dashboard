import type { IncomingLineItem } from '~~/shared/types/line-item'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
	try {
		const body = await readBody(event)
		const { name, description, type, price, total_sessions, service_id, items } = body

		if (!name || price === undefined) {
			throw createError({ statusCode: 400, statusMessage: 'Nombre y precio son requeridos' })
		}

		const calculatedSessions = type === 'MIXTO' && Array.isArray(items)
			? items.filter((it: IncomingLineItem) => (it.item_type || 'SERVICE') === 'SERVICE').reduce((sum: number, it: IncomingLineItem) => sum + Number(it.quantity || 0), 0)
			: Number(total_sessions || 1)

		const pkg = await prisma.package.create({
			data: {
				name,
				description,
				type: type || 'INDIVIDUAL',
				price: Number(price),
				total_sessions: calculatedSessions,
				service_id: service_id || null,
				status: 'activo',
				items: items && Array.isArray(items) && items.length > 0 ? {
					create: items.map((it: IncomingLineItem) => ({
						item_type: it.item_type || 'SERVICE',
						item_id: it.item_id,
						name: it.name,
						quantity: Number(it.quantity || 1),
						duration: Number(it.duration || 30)
					}))
				} : undefined
			},
			include: {
				items: true
			}
		})

		return pkg
	} catch (rawError) {
		const error = toApiError(rawError)
		if (error.statusCode) throw error
		throw createError({
			statusCode: 500,
			statusMessage: error.message || 'Error al crear el paquete'
		})
	}
})
