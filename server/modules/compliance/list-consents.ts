import type { ConsentsRepository, ConsentRecord } from './ports'

export interface ListConsentsDeps {
	consents: ConsentsRepository
}

export async function listConsents(deps: ListConsentsDeps, { userId }: { userId?: string } = {}): Promise<ConsentRecord[]> {
	return await deps.consents.findMany(userId)
}

