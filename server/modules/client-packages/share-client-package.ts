import { createError } from 'h3'
import { validateShareTargets } from '../../utils/package-sharing'
import type { ClientPackagesRepository } from './ports'

export interface ShareClientPackageDeps {
	clientPackages: ClientPackagesRepository
}

export async function shareClientPackage(
	deps: ShareClientPackageDeps,
	{ clientId, packageId, user_ids }: { clientId: string; packageId: string; user_ids: string[] },
) {
	const targetIds = validateShareTargets(clientId, user_ids)
	if (targetIds.length === 0) {
		throw createError({ statusCode: 400, statusMessage: 'No se puede compartir el bono con su propia dueña' })
	}

	const clientPkg = await deps.clientPackages.findByIdAndOwner(packageId, clientId)
	if (!clientPkg) {
		throw createError({ statusCode: 404, statusMessage: 'Bono no encontrado para este cliente' })
	}

	const allValid = await deps.clientPackages.verifyClientsExist(targetIds)
	if (!allValid) {
		throw createError({ statusCode: 400, statusMessage: 'Solo se puede compartir con clientes registrados' })
	}

	return await deps.clientPackages.createShares(packageId, targetIds)
}

