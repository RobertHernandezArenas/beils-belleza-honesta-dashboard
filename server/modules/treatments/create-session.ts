import { createError } from 'h3'
import type { TreatmentsRepository, NewSessionInput, TreatmentSessionRecord } from './ports'

export interface CreateSessionDeps {
	treatments: TreatmentsRepository
}

export async function createSession(
	deps: CreateSessionDeps,
	validated: NewSessionInput,
	defaultStaffId?: string | null,
): Promise<TreatmentSessionRecord> {
	// 1. Verify zone belongs to client
	const zone = await deps.treatments.findZoneByIdAndClient(validated.zone_id, validated.client_id)
	if (!zone) {
		throw createError({
			statusCode: 404,
			statusMessage: 'Zona de tratamiento no encontrada para este cliente',
		})
	}

	// 2. Determine session number if not explicitly specified
	let sessionNumber = validated.session_number
	if (!sessionNumber) {
		const count = await deps.treatments.countSessionsForZone(validated.zone_id)
		sessionNumber = count + 1
	}

	// 3. Create session in transaction
	return await deps.treatments.transaction(async uow => {
		if (validated.client_package_id) {
			if (validated.decrement_package) {
				await uow.consumePackage(validated.client_package_id, validated.client_id)
			} else {
				await uow.assertPackageAccess(validated.client_package_id, validated.client_id)
			}
		}

		return await uow.createSession({
			zone_id: validated.zone_id,
			client_id: validated.client_id,
			staff_id: validated.staff_id || defaultStaffId || null,
			client_package_id: validated.client_package_id || null,
			booking_id: validated.booking_id || null,
			session_number: sessionNumber,
			session_date: new Date(validated.session_date),
			parameters: validated.parameters.trim(),
			skin_reaction: validated.skin_reaction?.trim() || null,
			observations: validated.observations?.trim() || null,
		})
	})
}

