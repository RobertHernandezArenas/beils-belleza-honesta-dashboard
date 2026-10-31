import type { TreatmentsRepository, NewZoneInput, TreatmentZoneRecord } from './ports'

export interface CreateZoneDeps {
	treatments: TreatmentsRepository
}

export async function createZone(
	deps: CreateZoneDeps,
	data: NewZoneInput,
): Promise<TreatmentZoneRecord> {
	return await deps.treatments.createZone(data)
}

