import { createError } from 'h3'
import type { PackagesRepository, CatalogPackageRecord } from './ports'

export interface GetPackageDeps {
	packages: PackagesRepository
}

export async function getPackage(deps: GetPackageDeps, { id }: { id: string }): Promise<CatalogPackageRecord> {
	const pkg = await deps.packages.findById(id)
	if (!pkg) {
		throw createError({ statusCode: 404, statusMessage: 'Paquete no encontrado' })
	}
	return pkg
}

