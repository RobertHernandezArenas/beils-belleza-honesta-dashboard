import { catalogPackageSessions, type CatalogPackageInput } from '../../utils/package-validation'
import type { PackagesRepository, CatalogPackageRecord } from './ports'

export interface CreatePackageDeps {
	packages: PackagesRepository
}

export async function createPackage(
	deps: CreatePackageDeps,
	input: CatalogPackageInput,
): Promise<CatalogPackageRecord> {
	const { name, description, type, price, service_id, items } = input
	const calculatedSessions = catalogPackageSessions(input)

	return await deps.packages.create(
		{
			name,
			description,
			type,
			price,
			total_sessions: calculatedSessions,
			service_id,
		},
		items && items.length > 0 ? items : undefined,
	)
}

