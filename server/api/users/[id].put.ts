import type { Prisma } from '@prisma/client'
import { prisma } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'
import { parseUserUpdate, assertKeepsAnAdmin } from '../../utils/user-admin'
import { shouldRevokeSessions } from '../../utils/session-policy'
import { invalidateSessionUser } from '../../utils/session-store'
import bcrypt from 'bcryptjs'

export default defineEventHandler(async event => {
	requireAdmin(event)
	const id = event.context.params?.id
	if (!id) throw createError({ statusCode: 400, statusMessage: 'ID requerido' })

	// Strict allow-list: role/status are admin-only (enforced above); user_id, tokens and timestamps never
	const input = parseUserUpdate(await readBody(event))

	try {
		const current = await prisma.user.findUnique({ where: { user_id: id }, select: { role: true, status: true } })
		if (!current) throw createError({ statusCode: 404, statusMessage: 'Usuario no encontrado' })

		const activeAdmins = await prisma.user.count({ where: { role: 'ADMIN', status: 'ON' } })
		assertKeepsAnAdmin({ current, update: input, activeAdmins })

		const { password, birth_date, ...fields } = input
		const updateData: Prisma.UserUncheckedUpdateInput = { ...fields }
		if (password) updateData.password = await bcrypt.hash(password, 12)
		if (birth_date) updateData.birth_date = new Date(birth_date)
		// Role/status/password changes end the user's existing sessions
		const revoke = shouldRevokeSessions(input)
		if (revoke) updateData.token_version = { increment: 1 }

		const updatedUser = await prisma.user.update({
			where: { user_id: id },
			data: updateData,
		})

		if (revoke) invalidateSessionUser(id)

		const { password: _, refresh_token: __, token_version: ___, ...userData } = updatedUser
		return userData
	} catch (rawError) {
		const error = toApiError(rawError)
		if (error.statusCode) throw error
		if ((rawError as { code?: string }).code === 'P2002') {
			throw createError({ statusCode: 409, statusMessage: 'El email ya está en uso' })
		}
		console.error('Error updating user:', error)
		throw createError({
			statusCode: 500,
			statusMessage: 'Error al actualizar usuario',
		})
	}
})
