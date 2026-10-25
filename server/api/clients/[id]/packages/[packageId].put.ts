import type { Prisma } from '@prisma/client'
import { prisma } from '../../../../utils/prisma'
import { parseClientPackageUpdate } from '../../../../utils/package-validation'

export default defineEventHandler(async (event) => {
	try {
		const clientId = getRouterParam(event, 'id')
		const packageId = getRouterParam(event, 'packageId')

		if (!clientId || !packageId) {
			throw createError({ statusCode: 400, statusMessage: 'Client ID and Package ID required' })
		}

		const { total_sessions, remaining_sessions, expiry_date, custom_price, status, items } = parseClientPackageUpdate(await readBody(event))

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

		if (total_sessions != null) updateData.total_sessions = total_sessions
		if (remaining_sessions != null) updateData.remaining_sessions = remaining_sessions

		// The balance can't exceed the total, also when only one of them changes
		const nextTotal = total_sessions ?? existing.total_sessions
		const nextRemaining = remaining_sessions ?? existing.remaining_sessions
		if (nextRemaining > nextTotal) {
			throw createError({ statusCode: 400, statusMessage: 'Las sesiones restantes no pueden superar el total' })
		}

		if (custom_price !== undefined) updateData.custom_price = custom_price
		if (expiry_date !== undefined) updateData.expiry_date = expiry_date ? new Date(expiry_date) : null
		if (status !== undefined) updateData.status = status

		const updated = await prisma.$transaction(async (tx) => {
			if (Object.keys(updateData).length > 0) {
				await tx.clientPackage.update({
					where: { client_package_id: packageId },
					data: updateData
				})
			}

			for (const it of items ?? []) {
				// Scoped to this bono: an item id from another client's bono updates nothing (IDOR)
				const { count } = await tx.clientPackageItem.updateMany({
					where: { client_package_item_id: it.client_package_item_id, client_package_id: packageId },
					data: {
						...(it.quantity_total !== undefined ? { quantity_total: it.quantity_total } : {}),
						...(it.quantity_remaining !== undefined ? { quantity_remaining: it.quantity_remaining } : {})
					}
				})
				if (count === 0) {
					throw createError({ statusCode: 400, statusMessage: 'El servicio indicado no pertenece a este bono' })
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
			statusMessage: 'Error al actualizar el bono'
		})
	}
})
