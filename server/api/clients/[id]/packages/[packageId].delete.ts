import { prisma } from '../../../../utils/prisma'

export default defineEventHandler(async (event) => {
	try {
		const clientId = getRouterParam(event, 'id')
		const packageId = getRouterParam(event, 'packageId')

		if (!clientId || !packageId) {
			throw createError({ statusCode: 400, statusMessage: 'Client ID and Package ID required' })
		}

		// Verify package exists and belongs to client
		const clientPkg = await prisma.clientPackage.findFirst({
			where: {
				client_package_id: packageId,
				user_id: clientId
			}
		})

		if (!clientPkg) {
			throw createError({ statusCode: 404, statusMessage: 'Bono asignado no encontrado para este cliente' })
		}

		// Delete client package (cascades client_package_items and sets treatment_sessions client_package_id to null)
		await prisma.clientPackage.delete({
			where: { client_package_id: packageId }
		})

		return { success: true, message: 'Bono desasignado correctamente' }
	} catch (rawError) {
		const error = toApiError(rawError)
		console.error('Error deleting client package:', error)
		if (error.statusCode) throw error
		throw createError({
			statusCode: 500,
			statusMessage: error.message || 'Error al desasignar el bono'
		})
	}
})
