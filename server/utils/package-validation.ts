import { createError } from 'h3'
import { z } from 'zod'
import { parseOrBadRequest } from './validation'

/** Body schemas for catalog packages (bonos) and the bonos assigned to clients. */

const money = z.number({ message: 'Importe inválido' }).finite('Importe inválido').nonnegative('El importe no puede ser negativo')
const sessions = z.number().int('Las sesiones deben ser un número entero').min(0, 'No puede ser negativo').max(999)
const dateString = z.string().refine(v => !Number.isNaN(Date.parse(v)), 'Fecha inválida')
/** '' / null mean "no custom price" (the form sends '' when the field is cleared) */
const optionalMoney = z.union([money, z.literal(''), z.null()]).optional().transform(v => (v === '' ? null : v))

const packageItem = z.object({
	item_type: z.enum(['SERVICE', 'PRODUCT']).default('SERVICE'),
	item_id: z.string().min(1).max(100),
	name: z.string().trim().min(1).max(150),
	quantity: z.number().int().min(1, 'La cantidad debe ser al menos 1').max(999).default(1),
	duration: z.number().int().min(0).max(24 * 60).default(30),
})

const catalogPackage = z.object({
	name: z.string().trim().min(2, 'El nombre es obligatorio').max(150),
	description: z.string().nullish(),
	type: z.enum(['INDIVIDUAL', 'MIXTO'], { message: 'Tipo de paquete no válido' }).default('INDIVIDUAL'),
	price: money,
	total_sessions: sessions.min(1).default(1),
	service_id: z
		.string()
		.max(100)
		.nullish()
		.transform(v => v || null),
	items: z.array(packageItem).max(50).optional(),
})

export type CatalogPackageInput = z.infer<typeof catalogPackage>

export const parseCatalogPackage = (body: unknown) => parseOrBadRequest(catalogPackage, body)

/** MIXTO bonos count only their service items as sessions; INDIVIDUAL uses total_sessions. */
export function catalogPackageSessions(pkg: Pick<CatalogPackageInput, 'type' | 'total_sessions' | 'items'>) {
	if (pkg.type === 'MIXTO' && pkg.items) {
		return pkg.items.filter(it => it.item_type === 'SERVICE').reduce((sum, it) => sum + it.quantity, 0)
	}
	return pkg.total_sessions
}

const assignment = z.object({
	package_id: z.string({ message: 'package_id is required' }).min(1, 'package_id is required').max(100),
	expiry_months: z.number().int().min(0).max(120).nullish(),
	expiry_date: dateString.nullish(),
	custom_price: optionalMoney,
	total_sessions: sessions.nullish(),
})

export type PackageAssignmentInput = z.infer<typeof assignment>

export const parsePackageAssignment = (body: unknown) => parseOrBadRequest(assignment, body)

/** Explicit date wins; months > 0 adds months; 0/null means no expiry; omitted defaults to 6 months. */
export function resolveExpiryDate(
	input: Pick<PackageAssignmentInput, 'expiry_date' | 'expiry_months'>,
	now = new Date(),
): Date | null {
	if (input.expiry_date) return new Date(input.expiry_date)
	if (input.expiry_months === 0 || input.expiry_months === null) return null
	const date = new Date(now)
	date.setMonth(date.getMonth() + (input.expiry_months ?? 6))
	return date
}

const clientPackageItemUpdate = z.object({
	client_package_item_id: z.string().min(1).max(100),
	quantity_total: sessions.optional(),
	quantity_remaining: sessions.optional(),
})

const clientPackageUpdate = z.object({
	total_sessions: sessions.nullish(),
	remaining_sessions: sessions.nullish(),
	custom_price: optionalMoney,
	expiry_date: dateString.nullish(),
	status: z.enum(['ACTIVE', 'COMPLETED', 'CANCELLED', 'EXPIRED'], { message: 'Estado de bono no válido' }).optional(),
	items: z.array(clientPackageItemUpdate).max(50).optional(),
})

export type ClientPackageUpdateInput = z.infer<typeof clientPackageUpdate>

const impossibleBalance = () =>
	createError({ statusCode: 400, statusMessage: 'Las sesiones restantes no pueden superar el total' })

export function parseClientPackageUpdate(body: unknown): ClientPackageUpdateInput {
	const data = parseOrBadRequest(clientPackageUpdate, body)
	if (data.total_sessions != null && data.remaining_sessions != null && data.remaining_sessions > data.total_sessions) {
		throw impossibleBalance()
	}
	for (const it of data.items ?? []) {
		if (it.quantity_total !== undefined && it.quantity_remaining !== undefined && it.quantity_remaining > it.quantity_total) {
			throw impossibleBalance()
		}
	}
	return data
}
