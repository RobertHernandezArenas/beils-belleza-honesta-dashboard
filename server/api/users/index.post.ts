import { prisma } from '../../utils/prisma'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const userSchema = z.object({
	email: z.string().email('Email inválido'),
	name: z.string().min(2, 'El nombre es obligatorio'),
	surname: z.string().optional().default(''),
	phone: z.string().optional().default(''),
	address: z.string().optional().default(''),
	city: z.string().optional().default(''),
	country: z.string().optional().default(''),
	postal_code: z.string().optional().default(''),
	gender: z.string().optional().default(''),
	birth_date: z.string().optional().default(new Date().toISOString()),
	document_type: z.enum(['DNI', 'PASSPORT', 'NIE']).default('DNI'),
	document_number: z.string().optional().default(''),
	role: z.enum(['ADMIN', 'STAFF', 'CLIENT']).default('CLIENT'),
	status: z.enum(['ON', 'OFF']).default('ON'),
	avatar: z.string().optional(),
	password: z.string().optional().default('123456'),
})

export default defineEventHandler(async event => {
	try {
		const body = await readBody(event)
		const parsedData = userSchema.parse(body)

		const existingUser = await prisma.user.findUnique({ 
			where: { email: parsedData.email } 
		})
		
		if (existingUser) {
			throw createError({ statusCode: 400, statusMessage: 'El email ya está en uso' })
		}

		const hashedPassword = await bcrypt.hash(parsedData.password, 10)

		const newUser = await prisma.user.create({
			data: {
				...parsedData,
				password: hashedPassword,
				birth_date: new Date(parsedData.birth_date),
				avatar: parsedData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(parsedData.name)}&background=random`,
			},
		})

		const { password: _, ...userData } = newUser
		return userData
	} catch (error: any) {
		if (error instanceof z.ZodError) {
			throw createError({ statusCode: 400, statusMessage: error.message })
		}
		throw createError({
			statusCode: error.statusCode || 500,
			statusMessage: error.statusMessage || 'Error al crear usuario',
		})
	}
})
