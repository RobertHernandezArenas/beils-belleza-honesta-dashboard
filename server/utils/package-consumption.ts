import { createError } from 'h3'
import { assertCanConsume, canAccessPackage } from './package-sharing'

/**
 * Atomic bono consumption. Every place that spends sessions (TPV, treatment sessions) goes
 * through here: it checks who may consume (owner or beneficiary), status, expiry and balance,
 * then decrements with a conditional update so two concurrent sales can't overspend.
 * Must run inside a Prisma transaction: a 409 thrown here rolls back the whole operation.
 */

interface PackageRow {
	client_package_id: string
	user_id: string
	status: string
	expiry_date: Date | string | null
	remaining_sessions: number
	shares: { user_id: string }[]
}

interface PackageItemRow {
	client_package_item_id: string
	client_package_id: string
	quantity_remaining: number
}

/** The slice of Prisma's transaction client this module needs (kept narrow so tests can fake it). */
export interface ConsumptionTx {
	clientPackage: {
		findUnique(args: {
			where: { client_package_id: string }
			include: { shares: { select: { user_id: true } } }
		}): Promise<PackageRow | null>
		updateMany(args: {
			where: { client_package_id: string; remaining_sessions: { gte: number } }
			data: { remaining_sessions: { decrement: number } }
		}): Promise<{ count: number }>
	}
	clientPackageItem: {
		findUnique(args: { where: { client_package_item_id: string } }): Promise<PackageItemRow | null>
		updateMany(args: {
			where: { client_package_item_id: string; quantity_remaining: { gte: number } }
			data: { quantity_remaining: { decrement: number } }
		}): Promise<{ count: number }>
	}
}

/** Prisma's generic delegates don't structurally match the narrow interface; this is the one cast. */
export const asConsumptionTx = (tx: unknown) => tx as ConsumptionTx

interface ConsumeOptions {
	consumerId: string | null | undefined
	qty?: number
	now?: Date
}

const raceLost = () =>
	createError({ statusCode: 409, statusMessage: 'El bono no tiene sesiones suficientes' })

async function loadAuthorizedPackage(tx: ConsumptionTx, clientPackageId: string, opts: ConsumeOptions) {
	const row = await tx.clientPackage.findUnique({
		where: { client_package_id: clientPackageId },
		include: { shares: { select: { user_id: true } } },
	})
	if (!row) throw createError({ statusCode: 404, statusMessage: 'Bono no encontrado' })
	assertCanConsume({ ...row, shared_with: row.shares.map(s => s.user_id) }, opts.consumerId, opts)
	return row
}

/** For linking a record (e.g. a treatment session) to a bono without spending it. */
export async function assertPackageAccess(tx: unknown, clientPackageId: string, userId: string) {
	const row = await asConsumptionTx(tx).clientPackage.findUnique({
		where: { client_package_id: clientPackageId },
		include: { shares: { select: { user_id: true } } },
	})
	if (!row) throw createError({ statusCode: 404, statusMessage: 'Bono no encontrado' })
	if (!canAccessPackage({ user_id: row.user_id, shared_with: row.shares.map(s => s.user_id) }, userId)) {
		throw createError({ statusCode: 403, statusMessage: 'Este bono no pertenece al cliente ni está compartido con él' })
	}
}

async function decrementPackage(tx: ConsumptionTx, clientPackageId: string, qty: number) {
	const { count } = await tx.clientPackage.updateMany({
		where: { client_package_id: clientPackageId, remaining_sessions: { gte: qty } },
		data: { remaining_sessions: { decrement: qty } },
	})
	if (count === 0) throw raceLost()
}

export async function consumeClientPackage(
	tx: ConsumptionTx,
	{ clientPackageId, ...opts }: ConsumeOptions & { clientPackageId: string },
) {
	const qty = opts.qty ?? 1
	const row = await loadAuthorizedPackage(tx, clientPackageId, { ...opts, qty })
	await decrementPackage(tx, clientPackageId, qty)
	return row
}

export async function consumeClientPackageItem(
	tx: ConsumptionTx,
	{ clientPackageItemId, ...opts }: ConsumeOptions & { clientPackageItemId: string },
) {
	const qty = opts.qty ?? 1
	const item = await tx.clientPackageItem.findUnique({ where: { client_package_item_id: clientPackageItemId } })
	if (!item) throw createError({ statusCode: 404, statusMessage: 'Servicio del bono no encontrado' })

	const row = await loadAuthorizedPackage(tx, item.client_package_id, { ...opts, qty })

	const { count } = await tx.clientPackageItem.updateMany({
		where: { client_package_item_id: clientPackageItemId, quantity_remaining: { gte: qty } },
		data: { quantity_remaining: { decrement: qty } },
	})
	if (count === 0) throw raceLost()

	await decrementPackage(tx, item.client_package_id, qty)
	return row
}
