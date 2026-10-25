import { prisma } from '../../utils/prisma'
import { toPublicUser } from '../../utils/public-user'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { requireAdmin } from '../../utils/auth'
import { unusablePasswordSeed } from '../../utils/login-policy'

const clientSchema = z.object({
	email: z.string().email('Email inválido').optional().or(z.literal('')),
	name: z.string().min(2, 'El nombre es obligatorio'),
	surname: z.string().optional().or(z.literal('')),
	phone: z.string().optional().or(z.literal('')),
	address: z.string().optional().default(''),
	city: z.string().optional().default(''),
	country: z.string().optional().default(''),
	postal_code: z.string().optional().default(''),
	gender: z.string().optional().default(''),
	birth_date: z.string().optional().default(new Date().toISOString()),
	document_type: z.enum(['DNI', 'PASSPORT', 'NIE']).default('DNI'),
	document_number: z.string().optional().default(''),
	status: z.enum(['ON', 'OFF']).default('ON'),
	avatar: z.string().optional().default(''),
	annotations: z.string().optional().default(''),
	user_id: z.string().optional(),
})

export default defineEventHandler(async event => {
	try {
		// Only admins can create clients
		requireAdmin(event)
		const body = await readBody(event)
		const parsedData = clientSchema.parse(body)

		if (!parsedData.email) {
			parsedData.email = `sin-correo-${Date.now()}-${Math.floor(Math.random() * 1000)}@cliente.local`
		}

		const existingUser = await prisma.user.findUnique({
			where: { email: parsedData.email },
		})

		if (existingUser) {
			throw createError({
				statusCode: 409,
				statusMessage: 'El correo electrónico ya está registrado',
			})
		}

		// Clients are CRM records, not accounts: store a random, never-disclosed password hash
		// (login also rejects the CLIENT role). Never use a shared default password here.
		const hashedPassword = await bcrypt.hash(unusablePasswordSeed(), 12)

		const email = parsedData.email || `sin-correo-${Date.now()}-${Math.floor(Math.random() * 1000)}@cliente.local`

		const user = await prisma.user.create({
			data: {
				...parsedData,
				email,
				surname: parsedData.surname || '',
				phone: parsedData.phone || '',
				user_id: parsedData.user_id || undefined,
				birth_date: new Date(parsedData.birth_date),
				password: hashedPassword,
				role: 'CLIENT',
			},
		})

		return toPublicUser(user)
	} catch (rawError) {
		const error = toApiError(rawError)
		if (error.statusCode) throw error
		throw createError({
			statusCode: 400,
			statusMessage: error.message || 'Datos inválidos o error al crear cliente',
		})
	}
})
