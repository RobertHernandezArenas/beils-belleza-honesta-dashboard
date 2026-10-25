import { createError } from 'h3'
import { z } from 'zod'
import { parseOrBadRequest } from './validation'

/**
 * Staff/user administration rules. Schemas are strict allow-lists (no mass assignment of
 * user_id, refresh_token, timestamps…) with lengths matching the `users` columns.
 */

const MIN_PASSWORD_LENGTH = 8

const roleSchema = z.enum(['ADMIN', 'STAFF', 'CLIENT'])
const statusSchema = z.enum(['ON', 'OFF'])

const profileFields = {
	email: z.string().trim().email('Email inválido').max(50),
	name: z.string().trim().min(2, 'El nombre es obligatorio').max(50),
	surname: z.string().trim().max(50),
	phone: z.string().trim().max(20),
	address: z.string().trim().max(255),
	city: z.string().trim().max(50),
	country: z.string().trim().max(50),
	postal_code: z.string().trim().max(20),
	gender: z.string().trim().max(10),
	birth_date: z.string().refine(v => !Number.isNaN(Date.parse(v)), 'Fecha de nacimiento inválida'),
	document_type: z.enum(['DNI', 'PASSPORT', 'NIE']),
	document_number: z.string().trim().max(20),
	avatar: z.string().trim().max(255),
	role: roleSchema,
	status: statusSchema,
}

const passwordSchema = z
	.string()
	.min(MIN_PASSWORD_LENGTH, `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`)
	.max(128)

const createSchema = z
	.object({
		...profileFields,
		surname: profileFields.surname.default(''),
		phone: profileFields.phone.default(''),
		address: profileFields.address.default(''),
		city: profileFields.city.default(''),
		country: profileFields.country.default(''),
		postal_code: profileFields.postal_code.default(''),
		gender: profileFields.gender.default(''),
		birth_date: profileFields.birth_date.default(() => new Date().toISOString()),
		document_type: profileFields.document_type.default('DNI'),
		document_number: profileFields.document_number.default(''),
		avatar: profileFields.avatar.optional(),
		role: roleSchema.default('CLIENT'),
		status: statusSchema.default('ON'),
		password: passwordSchema,
	})
	.strict()

const updateSchema = z
	.object({
		...Object.fromEntries(Object.entries(profileFields).map(([k, v]) => [k, v.optional()])),
		// The form sends '' when the password is not being changed
		password: z.union([z.literal(''), passwordSchema]).optional(),
	})
	.strict()

/** Masked values (e.g. "****678Z") come back from list endpoints and must not overwrite the real one. */
const isMaskedDocument = (value: unknown) => typeof value === 'string' && value.includes('*')

export type UserCreateInput = z.infer<typeof createSchema>

export function parseUserCreate(body: unknown): UserCreateInput {
	return parseOrBadRequest(createSchema, body)
}

export interface UserUpdateInput {
	email?: string
	name?: string
	surname?: string
	phone?: string
	address?: string
	city?: string
	country?: string
	postal_code?: string
	gender?: string
	birth_date?: string
	document_type?: 'DNI' | 'PASSPORT' | 'NIE'
	document_number?: string
	avatar?: string
	role?: 'ADMIN' | 'STAFF' | 'CLIENT'
	status?: 'ON' | 'OFF'
	password?: string
}

export function parseUserUpdate(body: unknown): UserUpdateInput {
	const data = parseOrBadRequest(updateSchema, body) as UserUpdateInput
	if (!data.password) delete data.password
	if (isMaskedDocument(data.document_number)) delete data.document_number
	return data
}

const conflict = (statusMessage: string) => createError({ statusCode: 409, statusMessage })

export function assertCanDeleteUser({
	actorId,
	target,
	activeAdmins,
}: {
	actorId: string
	target: { user_id: string; role: string }
	activeAdmins: number
}) {
	if (target.user_id === actorId) throw conflict('No puedes eliminar tu propio usuario')
	if (target.role === 'ADMIN' && activeAdmins <= 1) throw conflict('No se puede eliminar al último administrador')
}

/** Demoting or deactivating the last active admin would lock everyone out of administration. */
export function assertKeepsAnAdmin({
	current,
	update,
	activeAdmins,
}: {
	current: { role: string; status: string }
	update: { role?: string; status?: string }
	activeAdmins: number
}) {
	const isActiveAdmin = current.role === 'ADMIN' && current.status === 'ON'
	const losesAdmin = (update.role && update.role !== 'ADMIN') || update.status === 'OFF'
	if (isActiveAdmin && losesAdmin && activeAdmins <= 1) {
		throw conflict('Debe quedar al menos un administrador activo')
	}
}
