import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
	try {
		const clientId = getRouterParam(event, 'id')
		if (!clientId) {
			throw createError({ statusCode: 400, statusMessage: 'Client ID required' })
		}

		const clientPackages = await prisma.clientPackage.findMany({
			where: {
				user_id: clientId,
				status: 'ACTIVE',
				remaining_sessions: { gt: 0 }
			},
			include: {
				package: true,
				items: true
			},
			orderBy: { created_at: 'desc' }
		})

		return (clientPackages || []).map(cp => ({
			client_package_id: cp.client_package_id,
			package_id: cp.package_id,
			name: cp.package?.name || 'Paquete / Bono',
			description: cp.package?.description || '',
			type: cp.package?.type || 'INDIVIDUAL',
			total_sessions: cp.total_sessions,
			remaining_sessions: cp.remaining_sessions,
			service_id: cp.package?.service_id || null,
			expiry_date: cp.expiry_date,
			items: (cp.items || []).map(it => ({
				client_package_item_id: it.client_package_item_id,
				package_item_id: it.package_item_id,
				name: it.name,
				item_type: it.item_type,
				quantity_total: it.quantity_total,
				quantity_remaining: it.quantity_remaining,
				duration: it.duration
			}))
		}))
	} catch (rawError) {
		const error = toApiError(rawError)
		console.error('Error fetching client packages:', error)
		if (error.statusCode) throw error
		throw createError({
			statusCode: 500,
			statusMessage: error.message || 'Error fetching client packages'
		})
	}
})
