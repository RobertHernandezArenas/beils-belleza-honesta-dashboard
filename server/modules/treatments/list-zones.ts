import { createError } from 'h3'
import type { TreatmentsRepository, TreatmentZoneRecord } from './ports'

export interface ListZonesDeps {
	treatments: TreatmentsRepository
}

export async function listZones(
	deps: ListZonesDeps,
	{ clientId, treatmentType }: { clientId?: string; treatmentType?: string },
): Promise<TreatmentZoneRecord[]> {
	if (!clientId) {
		throw createError({ statusCode: 400, statusMessage: 'El ID de cliente es obligatorio' })
	}

	return await deps.treatments.findZones(clientId, treatmentType)
}

