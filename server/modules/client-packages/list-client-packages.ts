import { toClientPackageView } from '../../utils/package-sharing'
import type { ClientPackagesRepository } from './ports'

export interface ListClientPackagesDeps {
	clientPackages: ClientPackagesRepository
}

export async function listClientPackages(
	deps: ListClientPackagesDeps,
	{ clientId, now }: { clientId: string; now?: Date },
) {
	const effectiveNow = now ?? new Date()
	const packages = await deps.clientPackages.findUsable(clientId, effectiveNow)

	return packages
		.map(cp => toClientPackageView(cp as any, clientId))
		.sort((a, b) => Number(a.is_shared) - Number(b.is_shared))
}

