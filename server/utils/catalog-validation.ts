import { createError } from 'h3'
import { z } from 'zod'
import { parseOrBadRequest } from './validation'

/**
 * Body schemas for catalog (products, services) and debts. Unknown keys are stripped (no mass
 * assignment of ids, timestamps or relations); money and quantities must be finite and >= 0.
 */

const money = z.number({ message: 'Importe inválido' }).finite('Importe inválido').nonnegative('El importe no puede ser negativo')
const taxRate = z.number().finite().min(0).max(100)
const count = z.number().int('Debe ser un número entero').nonnegative('No puede ser negativo')
const catalogStatus = z.enum(['activo', 'inactivo'])

/** Unique optional codes: '' would collide on the unique index, so it becomes null.
 *  undefined stays undefined: a partial update must not wipe an existing code. */
const uniqueCode = z
	.string()
	.trim()
	.max(50)
	.nullish()
	.transform(v => (v === undefined ? undefined : v || null))

const productFields = {
	name: z.string().trim().min(2, 'El nombre es obligatorio').max(150),
	description: z.string().nullish(),
	sku: uniqueCode,
	barcode: uniqueCode,
	price: money,
	tax_rate: taxRate.default(21),
	stock: count.default(0),
	min_stock: count.default(0),
	image_url: z.string().trim().max(255).nullish(),
	status: catalogStatus.default('activo'),
}

const productCreate = z.object(productFields)
const productUpdate = z.object({
	name: productFields.name.optional(),
	description: productFields.description,
	sku: uniqueCode.optional(),
	barcode: uniqueCode.optional(),
	price: money.optional(),
	tax_rate: taxRate.optional(),
	stock: count.optional(),
	min_stock: count.optional(),
	image_url: productFields.image_url,
	status: catalogStatus.optional(),
})

const serviceFields = {
	name: z.string().trim().min(2, 'El nombre es obligatorio').max(150),
	description: z.string().nullish(),
	code: uniqueCode,
	price: money,
	tax_rate: taxRate.default(21),
	duration: z.number().int().positive('La duración debe ser un número positivo').max(24 * 60),
	status: catalogStatus.default('activo'),
}

const serviceCreate = z.object(serviceFields)
const serviceUpdate = z.object({
	name: serviceFields.name.optional(),
	description: serviceFields.description,
	code: uniqueCode.optional(),
	price: money.optional(),
	tax_rate: taxRate.optional(),
	duration: serviceFields.duration.optional(),
	status: catalogStatus.optional(),
})

const dateString = z.string().refine(v => !Number.isNaN(Date.parse(v)), 'Fecha inválida')

const debtCreate = z.object({
	user_id: z.string({ message: 'El cliente es obligatorio' }).min(1, 'El cliente es obligatorio').max(100),
	cart_id: z.string().max(100).nullish(),
	amount: money.positive('El importe debe ser mayor que 0').optional(),
	due_date: dateString.nullish(),
	notes: z.string().max(2000).nullish(),
})

const debtUpdate = z.object({
	status: z.enum(['pending', 'partial', 'paid']).optional(),
	notes: z.string().max(2000).nullish(),
	remaining: money.optional(),
	due_date: dateString.nullish(),
})

/** Drop keys explicitly sent as undefined so Prisma only updates what was provided. */
const compact = <T extends Record<string, unknown>>(data: T) =>
	Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)) as T

export const parseProductCreate = (body: unknown) => parseOrBadRequest(productCreate, body)
export const parseProductUpdate = (body: unknown) => compact(parseOrBadRequest(productUpdate, body))
export const parseServiceCreate = (body: unknown) => parseOrBadRequest(serviceCreate, body)
export const parseServiceUpdate = (body: unknown) => compact(parseOrBadRequest(serviceUpdate, body))
export const parseDebtCreate = (body: unknown) => parseOrBadRequest(debtCreate, body)
export const parseDebtUpdate = (body: unknown) => compact(parseOrBadRequest(debtUpdate, body))

/**
 * A debt linked to a ticket is worth exactly what the ticket says (never a client-sent
 * amount) and must belong to the same client. Manual debts need an explicit amount.
 */
export function resolveDebtAmount({
	userId,
	requestedAmount,
	cart,
}: {
	userId: string
	requestedAmount: number | undefined
	cart: { user_id: string | null; total: number } | null
}) {
	if (cart) {
		if (cart.user_id !== userId) {
			throw createError({ statusCode: 400, statusMessage: 'El ticket no pertenece a este cliente' })
		}
		return Number(cart.total.toFixed(2))
	}
	if (requestedAmount === undefined) {
		throw createError({ statusCode: 400, statusMessage: 'Indica el importe de la deuda' })
	}
	return Number(requestedAmount.toFixed(2))
}
