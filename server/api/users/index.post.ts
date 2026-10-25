import { prisma } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'
import { parseUserCreate } from '../../utils/user-admin'
import bcrypt from 'bcryptjs'

export default defineEventHandler(async event => {
	requireAdmin(event)
	// Strict schema: explicit password (min 8, no default) and no extra fields
	const parsedData = parseUserCreate(await readBody(event))

	try {
		const existingUser = await prisma.user.findUnique({
			where: { email: parsedData.email }
		})

		if (existingUser) {
			throw createError({ statusCode: 400, statusMessage: 'El email ya está en uso' })
		}

		const hashedPassword = await bcrypt.hash(parsedData.password, 12)

		const newUser = await prisma.user.create({
			data: {
				...parsedData,
				password: hashedPassword,
				birth_date: new Date(parsedData.birth_date),
				avatar: parsedData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(parsedData.name)}&background=random`,
			},
		})

		const { password: _, refresh_token: __, ...userData } = newUser
		return userData
	} catch (rawError) {
		const error = toApiError(rawError)
		if (error.statusCode) throw error
		console.error('Error creating user:', error)
		throw createError({
			statusCode: 500,
			statusMessage: 'Error al crear usuario',
		})
	}
})
