import { createError } from 'h3'
import type { ClientPackageUpdateInput } from '../../utils/package-validation'
import type { ClientPackagesRepository } from './ports'

export interface UpdateClientPackageDeps {
	clientPackages: ClientPackagesRepository
}

export async function updateClientPackage(
	deps: UpdateClientPackageDeps,
	{ clientId, packageId, input }: { clientId: string; packageId: string; input: ClientPackageUpdateInput },
) {
	const existing = await deps.clientPackages.findByIdAndOwner(packageId, clientId)
	if (!existing) {
		throw createError({ statusCode: 404, statusMessage: 'Bono asignado no encontrado para este cliente' })
	}

	const nextTotal = input.total_sessions ?? existing.total_sessions
	const nextRemaining = input.remaining_sessions ?? existing.remaining_sessions
	if (nextRemaining > nextTotal) {
		throw createError({ statusCode: 400, statusMessage: 'Las sesiones restantes no pueden superar el total' })
	}

	return await deps.clientPackages.updatePackage(
		packageId,
		{
			total_sessions: input.total_sessions ?? undefined,
			remaining_sessions: input.remaining_sessions ?? undefined,
			custom_price: input.custom_price,
			expiry_date: input.expiry_date !== undefined ? (input.expiry_date ? new Date(input.expiry_date) : null) : undefined,
			status: input.status,
		},
		input.items,
	)
}

