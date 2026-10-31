import type { RevokesRepository } from './ports'

export interface DeleteRevokeDeps {
	revokes: RevokesRepository
}

export async function deleteRevoke(
	deps: DeleteRevokeDeps,
	{ id }: { id: string },
): Promise<{ success: true }> {
	await deps.revokes.delete(id)
	return { success: true }
}

