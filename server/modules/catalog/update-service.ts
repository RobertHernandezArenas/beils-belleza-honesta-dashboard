import { createError } from 'h3'
import type { ServicesRepository, UpdateServiceInput, ServiceRecord } from './ports'

export interface UpdateServiceDeps {
	services: ServicesRepository
}

export async function updateService(
	deps: UpdateServiceDeps,
	{ id, data }: { id: string; data: UpdateServiceInput },
): Promise<ServiceRecord> {
	try {
		return await deps.services.update(id, data)
	} catch (rawError) {
		const code = (rawError as { code?: string }).code
		if (code === 'P2002') {
			throw createError({ statusCode: 409, statusMessage: 'Ya existe un servicio con ese código' })
		}
		if (code === 'P2025') {
			throw createError({ statusCode: 404, statusMessage: 'Service not found' })
		}
		throw rawError
	}
}

