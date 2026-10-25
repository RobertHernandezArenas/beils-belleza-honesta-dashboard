import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
	try {
		const clientId = getRouterParam(event, 'id')
		if (!clientId) {
			throw createError({ statusCode: 400, statusMessage: 'Client ID required' })
		}

		// Usable bonos for this client: their own plus the ones shared with them (same rules as consumption)
		const clientPackages = await prisma.clientPackage.findMany({
			where: {
				status: 'ACTIVE',
				remaining_sessions: { gt: 0 },
				AND: [
					{ OR: [{ user_id: clientId }, { shares: { some: { user_id: clientId } } }] },
					{ OR: [{ expiry_date: null }, { expiry_date: { gt: new Date() } }] },
				],
			},
			include: {
				package: true,
				items: true,
				user: { select: { user_id: true, name: true, surname: true } },
				shares: { include: { user: { select: { user_id: true, name: true, surname: true } } } },
			},
			orderBy: { created_at: 'desc' }
		})

		// Own bonos first: auto-preselection in the UI must never pick someone else's bono
		return clientPackages
			.map(cp => toClientPackageView(cp, clientId))
			.sort((a, b) => Number(a.is_shared) - Number(b.is_shared))
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
