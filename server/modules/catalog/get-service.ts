import { createError } from 'h3'
import type { ServicesRepository, ServiceRecord } from './ports'

export interface GetServiceDeps {
	services: ServicesRepository
}

export async function getService(deps: GetServiceDeps, { id }: { id: string }): Promise<ServiceRecord> {
	const service = await deps.services.findById(id)
	if (!service) {
		throw createError({ statusCode: 404, statusMessage: 'Service not found' })
	}
	return service
}

