import { prisma } from '../../utils/prisma'
import { z } from 'zod'
import { requireAdmin } from '../../utils/auth'

const clientSchema = z.object({
	email: z.string().email('Email inválido').optional(),
	name: z.string().min(2, 'El nombre es obligatorio').optional(),
	surname: z.string().min(2, 'El apellido es obligatorio').optional(),
	phone: z.string().min(6, 'El teléfono es obligatorio').optional(),
	address: z.string().optional(),
	city: z.string().optional(),
	country: z.string().optional(),
	postal_code: z.string().optional(),
	gender: z.string().optional(),
	birth_date: z.string().optional(),
	document_type: z.enum(['DNI', 'PASSPORT', 'NIE']).optional(),
	document_number: z.string().optional(),
	status: z.enum(['ON', 'OFF']).optional(),
})

export default defineEventHandler(async event => {
	try {
		requireAdmin(event)
		const id = getRouterParam(event, 'id')
		if (!id) {
			throw createError({ statusCode: 400, statusMessage: 'ID requerido' })
		}

		const body = await readBody(event)
		const parsedData = clientSchema.parse(body)

		if (parsedData.email) {
			const existingUser = await prisma.user.findFirst({
				where: { email: parsedData.email, user_id: { not: id } },
			})

			if (existingUser) {
				throw createError({
					statusCode: 409,
					statusMessage: 'El correo electrónico ya está en uso por otro cliente',
				})
			}
		}

		const updateData: any = { ...parsedData }
		if (parsedData.birth_date) {
			updateData.birth_date = new Date(parsedData.birth_date)
		}

		const user = await prisma.user.update({
			where: { user_id: id, role: 'CLIENT' },
			data: updateData,
		})

		const { password, ...userWithoutPassword } = user
		return userWithoutPassword
	} catch (error: any) {
		if (error.code === 'P2025') {
			throw createError({ statusCode: 404, statusMessage: 'Cliente no encontrado' })
		}
		if (error.statusCode) throw error
		throw createError({
			statusCode: 400,
			statusMessage: error.message || 'Datos inválidos o error al actualizar cliente',
		})
	}
})
