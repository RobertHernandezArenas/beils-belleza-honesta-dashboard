import type { TreatmentsRepository } from './ports'

export interface DeleteZoneDeps {
	treatments: TreatmentsRepository
}

export async function deleteZone(
	deps: DeleteZoneDeps,
	{ zoneId }: { zoneId: string },
): Promise<{ success: true; message: string }> {
	await deps.treatments.deleteZone(zoneId)
	return { success: true, message: 'Zona eliminada correctamente' }
}

