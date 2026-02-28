import { defineEventHandler, readBody, createError } from 'h3'
import { prisma } from '../../utils/prisma'
import bcrypt from 'bcryptjs'

export default defineEventHandler(async event => {
	const body = await readBody(event)
	const {
		name,
		email,
		role,
		document_type,
		document_number,
		phone,
		address,
		city,
		country,
		postal_code,
		gender,
		birth_date,
		password,
	} = body

	if (!email || !name) {
		throw createError({ statusCode: 400, statusMessage: 'Faltan campos obligatorios' })
	}

	try {
		const existingUser = await prisma.user.findUnique({ where: { email } })
		if (existingUser) {
			throw createError({ statusCode: 400, statusMessage: 'El email ya está en uso' })
		}

		const hashedPassword = await bcrypt.hash(password || '123456', 10)

		const newUser = await prisma.user.create({
			data: {
				name,
				surname: body.surname || '',
				email,
				password: hashedPassword,
				role: role || 'USER',
				status: body.status || 'ON',
				avatar:
					body.avatar ||
					`https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
				phone: phone || '',
				address: address || '',
				city: city || '',
				country: country || '',
				postal_code: postal_code || '',
				gender: gender || '',
				birth_date: birth_date ? new Date(birth_date) : new Date('1990-01-01'),
				document_type: document_type || 'DNI',
				document_number: document_number || '',
			},
		})

		const { password: _, ...userData } = newUser
		return userData
	} catch (error: any) {
		throw createError({
			statusCode: error.statusCode || 500,
			statusMessage: error.statusMessage || 'Error al crear usuario',
		})
	}
})
