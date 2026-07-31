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
				package: true
			},
			orderBy: { created_at: 'desc' }
		})

		return clientPackages.map(cp => ({
			client_package_id: cp.client_package_id,
			package_id: cp.package_id,
			name: cp.package.name,
			description: cp.package.description,
			type: cp.package.type,
			total_sessions: cp.total_sessions,
			remaining_sessions: cp.remaining_sessions,
			service_id: cp.package.service_id,
			expiry_date: cp.expiry_date
		}))
	} catch (error: any) {
		if (error.statusCode) throw error
		throw createError({
			statusCode: 500,
			statusMessage: 'Error fetching client packages'
		})
	}
})
