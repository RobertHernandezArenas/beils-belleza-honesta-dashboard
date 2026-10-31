import type { ServicesRepository, ServiceSummary } from './ports'

export interface ListServicesDeps {
	services: ServicesRepository
}

export async function listServices(deps: ListServicesDeps, { search }: { search?: string } = {}): Promise<ServiceSummary[]> {
	return await deps.services.findMany(search)
}

