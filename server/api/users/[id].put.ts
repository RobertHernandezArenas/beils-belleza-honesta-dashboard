import { defineEventHandler, readBody, createError } from 'h3'
import { prisma } from '../../utils/prisma'
import bcrypt from 'bcryptjs'

export default defineEventHandler(async event => {
	const id = event.context.params?.id
	if (!id) throw createError({ statusCode: 400, statusMessage: 'ID requerido' })

	const body = await readBody(event)

	try {
		const updateData: any = { ...body }
		if (updateData.password) {
			updateData.password = await bcrypt.hash(updateData.password, 10)
		}
		if (updateData.birth_date) {
			updateData.birth_date = new Date(updateData.birth_date)
		}

		const updatedUser = await prisma.user.update({
			where: { user_id: id },
			data: updateData,
		})

		const { password: _, ...userData } = updatedUser
		return userData
	} catch (error) {
		throw createError({
			statusCode: 500,
			statusMessage: 'Error al actualizar usuario',
		})
	}
})
