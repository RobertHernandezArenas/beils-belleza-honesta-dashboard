import type { PackagesRepository, CatalogPackageRecord } from './ports'

export interface ListPackagesDeps {
	packages: PackagesRepository
}

export async function listPackages(deps: ListPackagesDeps): Promise<CatalogPackageRecord[]> {
	const packages = await deps.packages.findActive()

	// Guarantee total_sessions for MIXTO only counts SERVICE items
	return packages.map(pkg => {
		if (pkg.type === 'MIXTO' && pkg.items && pkg.items.length > 0) {
			const serviceSessions = pkg.items
				.filter(it => it.item_type === 'SERVICE')
				.reduce((sum, it) => sum + (it.quantity || 0), 0)
			return { ...pkg, total_sessions: serviceSessions }
		}
		return pkg
	})
}

