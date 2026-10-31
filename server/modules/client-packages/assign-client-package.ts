import { createError } from 'h3'
import { resolveExpiryDate, type PackageAssignmentInput } from '../../utils/package-validation'
import type { ClientPackagesRepository } from './ports'

export interface AssignClientPackageDeps {
	clientPackages: ClientPackagesRepository
}

export async function assignClientPackage(
	deps: AssignClientPackageDeps,
	{ clientId, input }: { clientId: string; input: PackageAssignmentInput },
) {
	const clientExists = await deps.clientPackages.verifyClientExists(clientId)
	if (!clientExists) {
		throw createError({ statusCode: 404, statusMessage: 'Cliente no encontrado' })
	}

	const catalogPkg = await deps.clientPackages.findCatalogPackage(input.package_id)
	if (!catalogPkg) {
		throw createError({ statusCode: 404, statusMessage: 'Paquete de catálogo no encontrado' })
	}

	const finalExpiryDate = resolveExpiryDate(input)

	const defaultTotalServiceSessions =
		catalogPkg.type === 'MIXTO' && catalogPkg.items && catalogPkg.items.length > 0
			? catalogPkg.items.filter((it: any) => it.item_type === 'SERVICE').reduce((sum: number, it: any) => sum + (it.quantity || 0), 0)
			: catalogPkg.total_sessions

	const finalTotalSessions = input.total_sessions ?? defaultTotalServiceSessions
	const parsedCustomPrice = input.custom_price ?? null

	return await deps.clientPackages.assignPackage({
		user_id: clientId,
		package_id: catalogPkg.package_id,
		total_sessions: finalTotalSessions,
		remaining_sessions: finalTotalSessions,
		expiry_date: finalExpiryDate,
		custom_price: parsedCustomPrice,
		status: 'ACTIVE',
		items: catalogPkg.items,
	})
}

