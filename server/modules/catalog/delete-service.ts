import type { ServicesRepository } from './ports'

export interface DeleteServiceDeps {
	services: ServicesRepository
}

export async function deleteService(
	deps: DeleteServiceDeps,
	{ id }: { id: string },
): Promise<{ success: true }> {
	await deps.services.delete(id)
	return { success: true }
}

