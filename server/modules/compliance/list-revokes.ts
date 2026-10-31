import type { RevokesRepository, RevokeRecord } from './ports'

export interface ListRevokesDeps {
	revokes: RevokesRepository
}

export async function listRevokes(
	deps: ListRevokesDeps,
	{ userId }: { userId?: string } = {},
): Promise<RevokeRecord[]> {
	return await deps.revokes.findMany(userId)
}

