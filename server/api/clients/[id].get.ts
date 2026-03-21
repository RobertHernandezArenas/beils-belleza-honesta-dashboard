import { prisma } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'
import { maskDocument } from '../../utils/privacy'

export default defineEventHandler(async event => {
	try {
		requireAdmin(event)
		const query = getQuery(event)
		const reveal = query.reveal === 'true'

		const id = getRouterParam(event, 'id')
		if (!id) {
			throw createError({ statusCode: 400, statusMessage: 'ID requerido' })
		}

		const client = await prisma.user.findUnique({
			where: { user_id: id, role: 'CLIENT' },
			include: {
				consents: true,
				questionnaires: true,
				revokes: true,
				client_bookings: {
					orderBy: { booking_date: 'desc' },
					take: 5,
				},
				carts: {
					where: { status: 'completed' },
					orderBy: { created_at: 'desc' },
					include: { items: true }
				},
				debts: {
					where: { status: { in: ['pending', 'partial'] } },
					include: {
						cart: {
							include: { items: true }
						},
						payments: {
							orderBy: { payment_date: 'desc' }
						}
					}
				},
			},
		})

		if (!client) {
			throw createError({ statusCode: 404, statusMessage: 'Cliente no encontrado' })
		}

		// Remove password from response and mask document number if not revealed
		const { password, ...rest } = client
		return {
			...rest,
			document_number: reveal ? client.document_number : maskDocument(client.document_number),
		}
	} catch (error: any) {
		if (error.statusCode) throw error
		throw createError({
			statusCode: 500,
			statusMessage: 'Error al obtener el cliente',
		})
	}
})
