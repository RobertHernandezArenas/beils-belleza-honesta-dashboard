import type { Prisma } from '@prisma/client'
import { prisma } from '../../utils/prisma'
import bcrypt from 'bcryptjs'

export default defineEventHandler(async event => {
	const id = event.context.params?.id
	if (!id) throw createError({ statusCode: 400, statusMessage: 'ID requerido' })

	const body = await readBody(event)

	try {
		const updateData: Prisma.UserUncheckedUpdateInput = { ...body }
		if (body.password) {
			updateData.password = await bcrypt.hash(body.password, 10)
		}
		if (body.birth_date) {
			updateData.birth_date = new Date(body.birth_date)
		}

		const updatedUser = await prisma.user.update({
			where: { user_id: id },
			data: updateData,
		})

		const { password: _, ...userData } = updatedUser
		return userData
	} catch {
		throw createError({
			statusCode: 500,
			statusMessage: 'Error al actualizar usuario',
		})
	}
})
