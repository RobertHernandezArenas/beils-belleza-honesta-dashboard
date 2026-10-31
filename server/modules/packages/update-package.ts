import { catalogPackageSessions, type CatalogPackageInput } from '../../utils/package-validation'
import type { PackagesRepository, CatalogPackageRecord } from './ports'

export interface UpdatePackageDeps {
	packages: PackagesRepository
}

export async function updatePackage(
	deps: UpdatePackageDeps,
	{ id, input }: { id: string; input: CatalogPackageInput },
): Promise<CatalogPackageRecord> {
	const { name, description, type, price, service_id, items } = input
	const calculatedSessions = catalogPackageSessions(input)

	return await deps.packages.transaction(async uow => {
		if (items) {
			await uow.deleteItems(id)
		}

		return await uow.updatePackage(
			id,
			{
				name,
				description,
				type,
				price,
				total_sessions: calculatedSessions,
				service_id,
			},
			items,
		)
	})
}

