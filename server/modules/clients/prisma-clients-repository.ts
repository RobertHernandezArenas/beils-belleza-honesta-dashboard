import type { PrismaClient, Prisma } from '@prisma/client'
import type { ClientsRepository, ClientsUnitOfWork, ListClientsQuery } from './ports'

export function createPrismaClientsRepository(db: PrismaClient): ClientsRepository {
	return {
		async findById(id: string) {
			return (await db.user.findUnique({
				where: { user_id: id },
			})) as any
		},

		async findByEmail(email: string) {
			return (await db.user.findUnique({
				where: { email },
			})) as any
		},

		async findOtherByEmail(email: string, excludeUserId: string) {
			return (await db.user.findFirst({
				where: { email, user_id: { not: excludeUserId } },
			})) as any
		},

		async create(data) {
			return (await db.user.create({
				data,
			})) as any
		},

		async update(id: string, data: Record<string, unknown>) {
			try {
				return (await db.user.update({
					where: { user_id: id, role: 'CLIENT' },
					data: data as Prisma.UserUncheckedUpdateInput,
				})) as any
			} catch (err: any) {
				if (err.code === 'P2025') return null
				throw err
			}
		},

		async list(query: ListClientsQuery) {
			const statusParam = (query.status || '').trim().toUpperCase()
			const whereClause: Prisma.UserWhereInput = { role: 'CLIENT' }
			if (statusParam === 'ON' || statusParam === 'OFF') {
				whereClause.status = statusParam as 'ON' | 'OFF'
			}
			if (query.search) {
				const terms = query.search.split(/\s+/).filter(Boolean).slice(0, 6)
				whereClause.AND = terms.map(term => ({
					OR: [
						{ name: { contains: term } },
						{ surname: { contains: term } },
						{ email: { contains: term } },
						{ phone: { contains: term } },
						{ document_number: { contains: term } },
					],
				}))
			}

			const [total, clients] = await Promise.all([
				db.user.count({ where: whereClause }),
				db.user.findMany({
					where: whereClause,
					orderBy: { created_at: 'desc' },
					skip: query.skip,
					take: query.limit,
					select: {
						user_id: true,
						name: true,
						surname: true,
						email: true,
						phone: true,
						document_type: true,
						document_number: true,
						status: true,
						avatar: true,
						_count: {
							select: { client_bookings: true, consents: true },
						},
					},
				}),
			])

			return { data: clients as any, total }
		},

		async findDetail(id: string) {
			const client = await db.user.findUnique({
				where: { user_id: id, role: 'CLIENT' },
				include: {
					consents: true,
					questionnaires: true,
					revokes: true,
					treatment_zones: {
						include: {
							sessions: {
								orderBy: { session_number: 'desc' },
								include: {
									staff: { select: { name: true, surname: true } },
									client_package: { include: { package: true } },
									booking: { select: { booking_date: true, start_time: true } },
								},
							},
						},
						orderBy: { created_at: 'desc' },
					},
					client_bookings: {
						orderBy: { booking_date: 'desc' },
						include: {
							booking_items: true,
							staff: { select: { name: true, surname: true } },
							carts: {
								include: { items: true },
							},
						},
					},
					carts: {
						where: { status: { in: ['completed', 'pending'] } },
						orderBy: { created_at: 'desc' },
						include: { items: true },
					},
					client_packages: {
						include: {
							package: true,
							items: true,
							shares: {
								orderBy: { created_at: 'asc' },
								include: { user: { select: { user_id: true, name: true, surname: true, avatar: true } } },
							},
						},
						orderBy: { created_at: 'desc' },
					},
					package_shares: {
						where: { client_package: { status: 'ACTIVE' } },
						orderBy: { created_at: 'desc' },
						include: {
							client_package: {
								include: {
									package: true,
									items: true,
									user: { select: { user_id: true, name: true, surname: true, avatar: true } },
								},
							},
						},
					},
					debts: {
						where: { status: { in: ['pending', 'partial'] } },
						include: {
							cart: {
								include: { items: true },
							},
							payments: {
								orderBy: { payment_date: 'desc' },
							},
						},
					},
				},
			})

			if (!client) return null

			const [
				topServices,
				topProducts,
				cartStats,
				bookings,
				paymentMethodsRaw,
				spendingHistoryRaw,
				nextBooking,
			] = await Promise.all([
				db.cartItem.groupBy({
					by: ['name'],
					where: { cart: { user_id: id, status: 'completed' }, item_type: 'service' },
					_sum: { quantity: true, total: true },
					orderBy: { _sum: { quantity: 'desc' } },
					take: 3,
				}),
				db.cartItem.groupBy({
					by: ['name'],
					where: { cart: { user_id: id, status: 'completed' }, item_type: 'product' },
					_sum: { quantity: true, total: true },
					orderBy: { _sum: { quantity: 'desc' } },
					take: 3,
				}),
				db.cart.aggregate({
					where: { user_id: id, status: 'completed' },
					_sum: { total: true },
					_count: { cart_id: true },
				}),
				db.booking.findMany({
					where: { client_id: id },
					orderBy: { booking_date: 'asc' },
					select: { booking_date: true, status: true },
				}),
				db.cart.groupBy({
					by: ['payment_method'],
					where: { user_id: id, status: 'completed' },
					_sum: { total: true },
					_count: { cart_id: true },
				}),
				db.cart.findMany({
					where: { user_id: id, status: 'completed' },
					orderBy: { created_at: 'asc' },
					select: { created_at: true, total: true, payment_method: true },
				}),
				db.booking.findFirst({
					where: {
						client_id: id,
						status: { in: ['PENDIENTE', 'CONFIRMADA'] },
						booking_date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
					},
					orderBy: [{ booking_date: 'asc' }, { start_time: 'asc' }],
					include: {
						booking_items: true,
						staff: { select: { name: true, surname: true } },
					},
				}),
			])

			return {
				client,
				topServices,
				topProducts,
				cartStats,
				bookings,
				paymentMethodsRaw,
				spendingHistoryRaw,
				nextBooking,
			}
		},

		async transaction(work) {
			return await db.$transaction(async tx => {
				const uow: ClientsUnitOfWork = {
					async deleteClientCascade(userId: string) {
						await tx.debt.deleteMany({ where: { user_id: userId } })
						await tx.cart.deleteMany({ where: { user_id: userId } })
						await tx.booking.deleteMany({ where: { client_id: userId } })
						await tx.clientPackage.deleteMany({ where: { user_id: userId } })
						await tx.consent.deleteMany({ where: { user_id: userId } })
						await tx.questionnaire.deleteMany({ where: { user_id: userId } })
						await tx.revoke.deleteMany({ where: { user_id: userId } })
						await tx.user.delete({ where: { user_id: userId } })
					},
				}
				return await work(uow)
			})
		},
	} satisfies ClientsRepository
}
