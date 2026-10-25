import { prisma } from '../../../../../utils/prisma'
import { requireAdmin } from '../../../../../utils/auth'
import { toApiError } from '../../../../../utils/errors'
import { validateShareTargets } from '../../../../../utils/package-sharing'
import { z } from 'zod'

const shareSchema = z.object({
	user_ids: z.array(z.string().min(1).max(100)).min(1, 'Selecciona al menos una persona').max(20),
})

/** Shares the client's bono with other registered clients (they consume from the same balance). */
export default defineEventHandler(async event => {
	try {
		requireAdmin(event)
		const clientId = getRouterParam(event, 'id')
		const packageId = getRouterParam(event, 'packageId')
		if (!clientId || !packageId) {
			throw createError({ statusCode: 400, statusMessage: 'Cliente y bono requeridos' })
		}

		const { user_ids } = shareSchema.parse(await readBody(event))
		const targetIds = validateShareTargets(clientId, user_ids)
		if (targetIds.length === 0) {
			throw createError({ statusCode: 400, statusMessage: 'No se puede compartir el bono con su propia dueña' })
		}

		// Only the owner's own bono can be shared (beneficiaries can't re-share)
		const clientPkg = await prisma.clientPackage.findFirst({
			where: { client_package_id: packageId, user_id: clientId },
			select: { client_package_id: true },
		})
		if (!clientPkg) {
			throw createError({ statusCode: 404, statusMessage: 'Bono no encontrado para este cliente' })
		}

		const targets = await prisma.user.findMany({
			where: { user_id: { in: targetIds }, role: 'CLIENT' },
			select: { user_id: true },
		})
		if (targets.length !== targetIds.length) {
			throw createError({ statusCode: 400, statusMessage: 'Solo se puede compartir con clientes registrados' })
		}

		await prisma.clientPackageShare.createMany({
			data: targetIds.map(user_id => ({ client_package_id: packageId, user_id })),
			skipDuplicates: true,
		})

		return prisma.clientPackageShare.findMany({
			where: { client_package_id: packageId },
			orderBy: { created_at: 'asc' },
			include: { user: { select: { user_id: true, name: true, surname: true, avatar: true } } },
		})
	} catch (rawError) {
		const error = toApiError(rawError)
		console.error('Error sharing client package:', error)
		if (error.statusCode) throw error
		throw createError({ statusCode: 500, statusMessage: 'Error al compartir el bono' })
	}
})
