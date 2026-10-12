import type { Prisma } from '@prisma/client'
import { prisma } from '../../../../utils/prisma'

export default defineEventHandler(async (event) => {
	try {
		const clientId = getRouterParam(event, 'id')
		const packageId = getRouterParam(event, 'packageId')

		if (!clientId || !packageId) {
			throw createError({ statusCode: 400, statusMessage: 'Client ID and Package ID required' })
		}

		const body = await readBody(event)
		const { total_sessions, remaining_sessions, expiry_date, custom_price, status, items } = body

		const existing = await prisma.clientPackage.findFirst({
			where: {
				client_package_id: packageId,
				user_id: clientId
			},
			include: { items: true }
		})

		if (!existing) {
			throw createError({ statusCode: 404, statusMessage: 'Bono asignado no encontrado para este cliente' })
		}

		const updateData: Prisma.ClientPackageUpdateInput = {}

		if (total_sessions !== undefined && total_sessions !== null) {
			updateData.total_sessions = Math.max(0, Number(total_sessions))
		}

		if (remaining_sessions !== undefined && remaining_sessions !== null) {
			updateData.remaining_sessions = Math.max(0, Number(remaining_sessions))
		}

		if (custom_price !== undefined) {
			updateData.custom_price = (custom_price !== null && custom_price !== '') ? Number(custom_price) : null
		}

		if (expiry_date !== undefined) {
			updateData.expiry_date = expiry_date ? new Date(expiry_date) : null
		}

		if (status !== undefined) {
			updateData.status = String(status).toUpperCase()
		}

		const updated = await prisma.$transaction(async (tx) => {
			if (Object.keys(updateData).length > 0) {
				await tx.clientPackage.update({
					where: { client_package_id: packageId },
					data: updateData
				})
			}

			if (Array.isArray(items)) {
				for (const it of items) {
					if (it.client_package_item_id) {
						await tx.clientPackageItem.update({
							where: { client_package_item_id: it.client_package_item_id },
							data: {
								...(it.quantity_total !== undefined ? { quantity_total: Number(it.quantity_total) } : {}),
								...(it.quantity_remaining !== undefined ? { quantity_remaining: Number(it.quantity_remaining) } : {})
							}
						})
					}
				}
			}

			return await tx.clientPackage.findUnique({
				where: { client_package_id: packageId },
				include: { package: true, items: true }
			})
		})

		return updated
	} catch (rawError) {
		const error = toApiError(rawError)
		console.error('Error updating client package:', error)
		if (error.statusCode) throw error
		throw createError({
			statusCode: 500,
			statusMessage: error.message || 'Error al actualizar el bono'
		})
	}
})
