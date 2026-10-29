import { prisma } from '../server/utils/prisma'
import { buildPasswordResetData, resolveResetPassword } from './admin-password'

/**
 * Rotates an ADMIN user's password and signs out every session of that user.
 * Usage: pnpm admin:reset-password <email>
 * The new password comes from NEW_ADMIN_PASSWORD or is generated and printed once.
 * Never pass the password as an argument: it would end up in the shell history.
 */
async function resetAdminPassword() {
	const email = process.argv[2]?.trim()
	if (!email) {
		console.error('❌ Uso: pnpm admin:reset-password <email-del-admin>')
		process.exitCode = 1
		return
	}

	try {
		const user = await prisma.user.findUnique({ where: { email }, select: { user_id: true, role: true } })
		if (!user || user.role !== 'ADMIN') {
			console.error(`❌ No existe un usuario ADMIN con el email ${email}`)
			process.exitCode = 1
			return
		}

		const { password, generated } = resolveResetPassword(process.env)
		await prisma.user.update({ where: { user_id: user.user_id }, data: await buildPasswordResetData(password) })

		console.log(`✅ Contraseña actualizada para ${email}. Todas sus sesiones abiertas quedaron cerradas.`)
		if (generated) console.log(`🔑 Nueva contraseña: ${password} (guárdala ahora; no se vuelve a mostrar)`)
		else console.log('🔑 Nueva contraseña: la definida en NEW_ADMIN_PASSWORD')
	} catch (error) {
		console.error('❌ No se pudo cambiar la contraseña:', error instanceof Error ? error.message : error)
		process.exitCode = 1
	} finally {
		await prisma.$disconnect()
	}
}

resetAdminPassword()
