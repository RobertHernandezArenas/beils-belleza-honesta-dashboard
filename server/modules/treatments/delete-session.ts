import type { TreatmentsRepository } from './ports'

export interface DeleteSessionDeps {
	treatments: TreatmentsRepository
}

export async function deleteSession(
	deps: DeleteSessionDeps,
	{ sessionId }: { sessionId: string },
): Promise<{ success: true; message: string }> {
	await deps.treatments.deleteSession(sessionId)
	return { success: true, message: 'Sesión eliminada correctamente' }
}

