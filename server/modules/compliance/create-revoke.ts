import type { RevokesRepository, RevokeRecord } from './ports'

export interface CreateRevokeDeps {
	revokes: RevokesRepository
}

export interface CreateRevokeInput {
	user_id: string
	reason?: string
	date_revoked?: string
}

export async function createRevoke(
	deps: CreateRevokeDeps,
	input: CreateRevokeInput,
): Promise<RevokeRecord> {
	return await deps.revokes.create({
		user_id: input.user_id,
		reason: input.reason,
		date_revoked: input.date_revoked ? new Date(input.date_revoked) : new Date(),
	})
}

