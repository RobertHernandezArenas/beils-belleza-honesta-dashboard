import type { RevokesRepository, RevokeRecord } from './ports'

export interface UpdateRevokeDeps {
	revokes: RevokesRepository
}

export interface UpdateRevokeInput {
	reason?: string | null
	date_revoked?: string
}

export async function updateRevoke(
	deps: UpdateRevokeDeps,
	{ id, data }: { id: string; data: UpdateRevokeInput },
): Promise<RevokeRecord> {
	return await deps.revokes.update(id, {
		reason: data.reason,
		date_revoked: data.date_revoked ? new Date(data.date_revoked) : undefined,
	})
}

