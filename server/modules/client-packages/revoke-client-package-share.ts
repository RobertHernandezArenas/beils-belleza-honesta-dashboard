import { createError } from 'h3'
import type { ClientPackagesRepository } from './ports'

export interface RevokeClientPackageShareDeps {
	clientPackages: ClientPackagesRepository
}

export async function revokeClientPackageShare(
	deps: RevokeClientPackageShareDeps,
	{ clientId, packageId, userId }: { clientId: string; packageId: string; userId: string },
) {
	const { count } = await deps.clientPackages.deleteShare(packageId, userId, clientId)
	if (count === 0) {
		throw createError({ statusCode: 404, statusMessage: 'Esta persona no tiene acceso a este bono' })
	}
	return { success: true }
}

