import { prisma } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'

export default defineEventHandler(async event => {
	try {
		requireAdmin(event)
		const id = getRouterParam(event, 'id')
		if (!id) {
			throw createError({ statusCode: 400, statusMessage: 'ID requerido' })
		}

		const existing = await prisma.user.findUnique({ where: { user_id: id }, select: { user_id: true, role: true } })
		if (!existing || existing.role !== 'CLIENT') {
			throw createError({ statusCode: 404, statusMessage: 'Cliente no encontrado' })
		}

		// Remove every record that references the client before deleting the user.
		// bookings.client_id and debts.user_id use ON DELETE NO ACTION, so a plain
		// user.delete() is blocked by foreign keys; carts/consents would otherwise be
		// orphaned. Order matters (children/dependents first). Child rows with ON
		// DELETE CASCADE (booking_items, cart_items, debt_payments, client_package_items)
		// are removed automatically with their parent.
		await prisma.$transaction(async tx => {
			await tx.debt.deleteMany({ where: { user_id: id } }) // cascades debt_payments; before carts (debts ref carts)
			await tx.cart.deleteMany({ where: { user_id: id } }) // cascades cart_items; before bookings (carts ref bookings)
			await tx.booking.deleteMany({ where: { client_id: id } }) // cascades booking_items
			await tx.clientPackage.deleteMany({ where: { user_id: id } }) // cascades client_package_items
			await tx.consent.deleteMany({ where: { user_id: id } })
			await tx.questionnaire.deleteMany({ where: { user_id: id } })
			await tx.revoke.deleteMany({ where: { user_id: id } })
			await tx.user.delete({ where: { user_id: id } })
		})

		return { success: true }
	} catch (error: any) {
		if (error.statusCode) throw error
		if (error.code === 'P2025') {
			throw createError({ statusCode: 404, statusMessage: 'Cliente no encontrado' })
		}
		console.error('Error deleting client:', error)
		throw createError({
			statusCode: 500,
			statusMessage: error?.message || 'Error al eliminar cliente',
		})
	}
})
