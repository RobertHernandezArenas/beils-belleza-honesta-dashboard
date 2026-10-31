import { createError } from 'h3'
import type { ServicesRepository, NewServiceInput, ServiceRecord } from './ports'

export function calculateNextServiceCode(codes: string[]): string {
	let maxNumber = 0
	for (const code of codes) {
		if (!code) continue
		const match = code.match(/^SVC-(\d+)$/)
		if (match && match[1]) {
			const num = parseInt(match[1], 10)
			if (num > maxNumber) {
				maxNumber = num
			}
		}
	}
	const nextNumber = maxNumber + 1
	const paddedNumber = String(nextNumber).padStart(2, '0')
	return `SVC-${paddedNumber}`
}

export interface CreateServiceDeps {
	services: ServicesRepository
}

export async function createService(deps: CreateServiceDeps, data: NewServiceInput): Promise<ServiceRecord> {
	try {
		if (!data.code) {
			const existingCodes = await deps.services.findExistingSvcCodes()
			data.code = calculateNextServiceCode(existingCodes)
		}

		return await deps.services.create(data)
	} catch (rawError) {
		if ((rawError as { code?: string }).code === 'P2002') {
			throw createError({ statusCode: 409, statusMessage: 'Ya existe un servicio con ese código' })
		}
		throw rawError
	}
}

