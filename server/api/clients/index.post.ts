import { prisma } from '../../utils/prisma'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { requireAdmin } from '../../utils/auth'
import { createClient } from '../../modules/clients/create-client'
import { createPrismaClientsRepository } from '../../modules/clients/prisma-clients-repository'

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
		requireAdmin(event)
		const body = await readBody(event)
		const parsedData = clientSchema.parse(body)

		return await createClient(
			{
				clients: createPrismaClientsRepository(prisma),
				hashPassword: pass => bcrypt.hash(pass, 12),
				now: () => new Date(),
				randomInt: max => Math.floor(Math.random() * max),
			},
			parsedData,
		)
	} catch (rawError) {
		const error = toApiError(rawError)
		if (error.statusCode) throw error
		throw createError({
			statusCode: 400,
			statusMessage: error.message || 'Datos inválidos o error al crear cliente',
		})
	}
})
