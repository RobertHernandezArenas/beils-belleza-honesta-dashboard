import type { PackagesRepository } from './ports'

export interface DeletePackageDeps {
	packages: PackagesRepository
}

export async function deletePackage(
	deps: DeletePackageDeps,
	{ id }: { id: string },
): Promise<{ success: true }> {
	await deps.packages.deactivate(id)
	return { success: true }
}

