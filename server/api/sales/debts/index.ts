import { parseDebtCreate, resolveDebtAmount } from '../../../utils/catalog-validation'
import type { Prisma } from '@prisma/client'
export default defineEventHandler(async event => {
	const method = event.node.req.method

	if (method === 'GET') {
		const query = getQuery(event)
		const status = query.status as string | undefined

		const whereClause: Prisma.DebtWhereInput = {}
		if (status) {
			if (status === 'pending') {
				whereClause.status = { in: ['pending', 'partial'] }
			} else {
				whereClause.status = status
			}
		}

		const debts = await prisma.debt.findMany({
			where: whereClause,
			include: {
				user: { select: { name: true, surname: true, phone: true } },
				payments: { orderBy: { payment_date: 'asc' } },
				cart: {
					select: { total: true, created_at: true, invoice_number: true, payment_method: true, items: true },
				},
			},
			orderBy: { created_at: 'desc' },
		})

		return debts
	}

	if (method === 'POST') {
		const input = parseDebtCreate(await readBody(event))

		// A debt for a ticket is worth what the ticket says, and only for that ticket's client
		const cart = input.cart_id
			? await prisma.cart.findUnique({ where: { cart_id: input.cart_id }, select: { user_id: true, total: true } })
			: null
		if (input.cart_id && !cart) throw createError({ statusCode: 404, statusMessage: 'Ticket no encontrado' })
		const amount = resolveDebtAmount({ userId: input.user_id, requestedAmount: input.amount, cart })

		const debt = await prisma.debt.create({
			data: {
				user_id: input.user_id,
				cart_id: input.cart_id ?? null,
				amount,
				remaining: amount,
				status: 'pending',
				notes: input.notes ?? null,
				due_date: input.due_date ? new Date(input.due_date) : null,
			},
			include: { user: { select: { name: true, surname: true } } },
		})

		return debt
	}
})
