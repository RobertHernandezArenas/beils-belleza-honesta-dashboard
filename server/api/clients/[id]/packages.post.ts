import { prisma } from '../../../utils/prisma'
import { parsePackageAssignment, resolveExpiryDate } from '../../../utils/package-validation'

export default defineEventHandler(async (event) => {
	try {
		const clientId = getRouterParam(event, 'id')
		if (!clientId) {
			throw createError({ statusCode: 400, statusMessage: 'Client ID required' })
		}

		const input = parsePackageAssignment(await readBody(event))
		const { package_id, total_sessions } = input

		const client = await prisma.user.findFirst({ where: { user_id: clientId, role: 'CLIENT' }, select: { user_id: true } })
		if (!client) {
			throw createError({ statusCode: 404, statusMessage: 'Cliente no encontrado' })
		}

		const catalogPkg = await prisma.package.findUnique({
			where: { package_id },
			include: { items: true }
		})

		if (!catalogPkg) {
			throw createError({ statusCode: 404, statusMessage: 'Paquete de catálogo no encontrado' })
		}

		const finalExpiryDate = resolveExpiryDate(input)

		const defaultTotalServiceSessions = catalogPkg.type === 'MIXTO' && catalogPkg.items && catalogPkg.items.length > 0
			? catalogPkg.items.filter(it => it.item_type === 'SERVICE').reduce((sum, it) => sum + (it.quantity || 0), 0)
			: catalogPkg.total_sessions

		const finalTotalSessions = total_sessions ?? defaultTotalServiceSessions
		const parsedCustomPrice = input.custom_price ?? null

		const clientPkg = await prisma.$transaction(async (tx) => {
			const cp = await tx.clientPackage.create({
				data: {
					user_id: clientId,
					package_id: catalogPkg.package_id,
					total_sessions: finalTotalSessions,
					remaining_sessions: finalTotalSessions,
					expiry_date: finalExpiryDate,
					custom_price: parsedCustomPrice,
					status: 'ACTIVE'
				}
			})

			if (catalogPkg.items && catalogPkg.items.length > 0) {
				await tx.clientPackageItem.createMany({
					data: catalogPkg.items.map(it => ({
						client_package_id: cp.client_package_id,
						package_item_id: it.package_item_id,
						name: it.name,
						item_type: it.item_type,
						quantity_total: it.quantity,
						quantity_remaining: it.quantity,
						duration: it.duration
					}))
				})
			}

			return await tx.clientPackage.findUnique({
				where: { client_package_id: cp.client_package_id },
				include: { package: true, items: true }
			})
		})

		return clientPkg
	} catch (rawError) {
		const error = toApiError(rawError)
		if (error.statusCode) throw error
		console.error('Error assigning client package:', error)
		throw createError({
			statusCode: 500,
			statusMessage: 'Error al asignar paquete al cliente'
		})
	}
})
