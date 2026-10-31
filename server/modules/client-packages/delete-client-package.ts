import { createError } from 'h3'
import type { ClientPackagesRepository } from './ports'

export interface DeleteClientPackageDeps {
	clientPackages: ClientPackagesRepository
}

export async function deleteClientPackage(
	deps: DeleteClientPackageDeps,
	{ clientId, packageId }: { clientId: string; packageId: string },
) {
	const existing = await deps.clientPackages.findByIdAndOwner(packageId, clientId)
	if (!existing) {
		throw createError({ statusCode: 404, statusMessage: 'Bono asignado no encontrado para este cliente' })
	}

	await deps.clientPackages.deletePackage(packageId)
	return { success: true, message: 'Bono desasignado correctamente' }
}

