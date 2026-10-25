import { createError } from 'h3'

/**
 * Bono (client package) access rules. A package belongs to its buyer (`user_id`) and can be
 * shared with other registered clients, who consume from the same balance. Pure functions:
 * no Prisma, so they are unit-tested directly (tests/package-consumption.test.ts).
 */

export interface ConsumablePackage {
	user_id: string
	status: string
	expiry_date: Date | string | null
	remaining_sessions: number
	/** user_ids of beneficiaries the package was shared with */
	shared_with: string[]
}

export type ConsumeDenial = 'NO_CONSUMER' | 'NOT_ALLOWED' | 'INACTIVE' | 'EXPIRED' | 'INSUFFICIENT'

export type ConsumeCheck =
	| { ok: true }
	| { ok: false; reason: ConsumeDenial; statusCode: 400 | 403 | 409; message: string }

const DENIALS: Record<ConsumeDenial, { statusCode: 400 | 403 | 409; message: string }> = {
	NO_CONSUMER: { statusCode: 400, message: 'Selecciona el cliente que consume la sesión del bono' },
	NOT_ALLOWED: { statusCode: 403, message: 'Este bono no pertenece al cliente ni está compartido con él' },
	INACTIVE: { statusCode: 409, message: 'El bono no está activo' },
	EXPIRED: { statusCode: 409, message: 'El bono está caducado' },
	INSUFFICIENT: { statusCode: 409, message: 'El bono no tiene sesiones suficientes' },
}

const deny = (reason: ConsumeDenial): ConsumeCheck => ({ ok: false, reason, ...DENIALS[reason] })

/** Owner or beneficiary — the only people a bono may be used for or linked to. */
export function canAccessPackage(pkg: Pick<ConsumablePackage, 'user_id' | 'shared_with'>, userId: string | null | undefined) {
	return !!userId && (pkg.user_id === userId || pkg.shared_with.includes(userId))
}

export function checkConsume(
	pkg: ConsumablePackage,
	consumerId: string | null | undefined,
	{ qty = 1, now = new Date() }: { qty?: number; now?: Date } = {},
): ConsumeCheck {
	if (!consumerId) return deny('NO_CONSUMER')
	if (!canAccessPackage(pkg, consumerId)) return deny('NOT_ALLOWED')
	if (pkg.status !== 'ACTIVE') return deny('INACTIVE')
	if (pkg.expiry_date && new Date(pkg.expiry_date) < now) return deny('EXPIRED')
	if (pkg.remaining_sessions < qty) return deny('INSUFFICIENT')
	return { ok: true }
}

export function assertCanConsume(...args: Parameters<typeof checkConsume>) {
	const result = checkConsume(...args)
	if (!result.ok) throw createError({ statusCode: result.statusCode, statusMessage: result.message })
}

/** Cleans the beneficiary list: trimmed, unique, non-empty, never the owner. */
export function validateShareTargets(ownerId: string, ids: unknown[]): string[] {
	const cleaned = ids
		.filter((id): id is string => typeof id === 'string')
		.map(id => id.trim())
		.filter(id => id && id !== ownerId)
	return [...new Set(cleaned)]
}

interface PersonRef {
	user_id: string
	name: string
	surname: string | null
}

export interface ClientPackageRecord {
	client_package_id: string
	package_id: string
	user_id: string
	total_sessions: number
	remaining_sessions: number
	expiry_date: Date | string | null
	custom_price: number | null
	status: string
	package: { name: string; description: string | null; type: string; price: number; service_id: string | null } | null
	items: {
		client_package_item_id: string
		package_item_id: string
		name: string
		item_type: string
		quantity_total: number
		quantity_remaining: number
		duration: number
	}[]
	user?: PersonRef | null
	shares?: { user_id: string; user: PersonRef | null }[]
}

/**
 * API view of a client package as seen by `viewerId`: own packages list who they are shared
 * with; packages shared with the viewer are flagged `is_shared` and carry their owner.
 */
export function toClientPackageView(cp: ClientPackageRecord, viewerId: string) {
	const isShared = cp.user_id !== viewerId
	return {
		client_package_id: cp.client_package_id,
		package_id: cp.package_id,
		name: cp.package?.name || 'Paquete / Bono',
		description: cp.package?.description || '',
		type: cp.package?.type || 'INDIVIDUAL',
		total_sessions: cp.total_sessions,
		remaining_sessions: cp.remaining_sessions,
		service_id: cp.package?.service_id || null,
		expiry_date: cp.expiry_date,
		status: cp.status,
		custom_price: cp.custom_price,
		price: cp.custom_price ?? cp.package?.price ?? 0,
		package: cp.package,
		items: cp.items,
		is_shared: isShared,
		owner: isShared && cp.user ? { user_id: cp.user.user_id, name: cp.user.name, surname: cp.user.surname } : null,
		shared_with: (cp.shares ?? [])
			.filter(s => s.user)
			.map(s => ({ user_id: s.user_id, name: s.user!.name, surname: s.user!.surname })),
	}
}
