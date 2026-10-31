import type { Prisma, PrismaClient } from '@prisma/client'
import type { BookingsRepository, BookingFilters, BookingSummaryRecord } from './ports'

export function createPrismaBookingsRepository(db: PrismaClient): BookingsRepository {
	return {
		async findMany(filters: BookingFilters): Promise<BookingSummaryRecord[]> {
			const whereClause: Prisma.BookingWhereInput = {}

			if (filters.search) {
				whereClause.OR = [
					{ client: { name: { contains: filters.search } } },
					{ client: { surname: { contains: filters.search } } },
					{ client: { phone: { contains: filters.search } } },
					{ staff: { name: { contains: filters.search } } },
					{ notes: { contains: filters.search } },
				]
			} else if (filters.start && filters.end) {
				whereClause.booking_date = {
					gte: new Date(filters.start),
					lte: new Date(filters.end),
				}
			}

			if (filters.staff_id) whereClause.staff_id = filters.staff_id
			if (filters.client_id) whereClause.client_id = filters.client_id

			return (await db.booking.findMany({
				where: whereClause,
				select: {
					booking_id: true,
					booking_date: true,
					start_time: true,
					end_time: true,
					status: true,
					booking_items: {
						select: {
							item_type: true,
							item_id: true,
							name: true,
							duration: true,
						},
					},
					duration: true,
					notes: true,
					client_id: true,
					client: { select: { name: true, surname: true, phone: true, avatar: true } },
					staff: { select: { name: true, surname: true } },
					carts: {
						select: {
							cart_id: true,
							status: true,
							invoice_number: true,
							total: true,
						},
					},
				},
				orderBy: [{ booking_date: 'asc' }, { start_time: 'asc' }],
			})) as BookingSummaryRecord[]
		},

		async findById(id: string): Promise<any | null> {
			return await db.booking.findUnique({
				where: { booking_id: id },
				include: {
					client: { select: { user_id: true, name: true, surname: true, email: true, phone: true, avatar: true } },
					staff: { select: { name: true, surname: true } },
					booking_items: true,
					carts: {
						select: {
							cart_id: true,
							status: true,
							invoice_number: true,
							total: true,
						},
					},
				},
			})
		},

		async findFirstAdminId(): Promise<string | null> {
			const firstAdmin = await db.user.findFirst({
				where: { role: 'ADMIN', status: 'ON' },
				orderBy: { created_at: 'asc' },
				select: { user_id: true },
			})
			return firstAdmin?.user_id ?? null
		},

		async findOverlapping(
			date: Date,
			startTime: string,
			endTime: string,
			staffId: string,
			excludeBookingId?: string,
		): Promise<{ start_time: string; end_time: string } | null> {
			const whereClause: Prisma.BookingWhereInput = {
				booking_date: date,
				status: { notIn: ['CANCELADA', 'AUSENTE', 'cancelled', 'no_show'] },
				staff_id: staffId,
				start_time: { lt: endTime },
				end_time: { gt: startTime },
			}
			if (excludeBookingId) {
				whereClause.booking_id = { not: excludeBookingId }
			}

			return await db.booking.findFirst({
				where: whereClause,
				select: { start_time: true, end_time: true },
			})
		},

		async hasCompletedCart(bookingId: string): Promise<boolean> {
			const cart = await db.cart.findFirst({
				where: { booking_id: bookingId, status: 'completed' },
				select: { cart_id: true },
			})
			return Boolean(cart)
		},

		async verifyClientExists(clientId: string): Promise<boolean> {
			const client = await db.user.findFirst({
				where: { user_id: clientId, role: 'CLIENT' },
				select: { user_id: true },
			})
			return Boolean(client)
		},

		async verifyStaffExists(staffId: string): Promise<boolean> {
			const staff = await db.user.findFirst({
				where: { user_id: staffId, role: { in: ['ADMIN', 'STAFF'] } },
				select: { user_id: true },
			})
			return Boolean(staff)
		},

		async create(data: any): Promise<any> {
			return await db.booking.create({
				data: {
					client_id: data.client_id,
					staff_id: data.staff_id,
					status: data.status,
					booking_date: data.booking_date,
					start_time: data.start_time,
					end_time: data.end_time,
					duration: data.duration,
					notes: data.notes,
					item_type: data.item_type,
					item_id: data.item_id,
					booking_items: {
						create: data.items.map((item: any) => ({
							item_type: item.item_type || 'SERVICE',
							item_id: item.item_id || '',
							name: item.name || 'Servicio',
							duration: Number(item.duration) || 0,
						})),
					},
				},
				include: {
					client: { select: { name: true, surname: true, phone: true, avatar: true } },
					staff: { select: { name: true, surname: true } },
					booking_items: true,
				},
			})
		},

		async update(id: string, data: any): Promise<any> {
			return await db.booking.update({
				where: { booking_id: id },
				data: {
					client_id: data.client_id,
					staff_id: data.staff_id,
					status: data.status,
					booking_date: data.booking_date,
					start_time: data.start_time,
					duration: data.duration,
					end_time: data.end_time,
					notes: data.notes,
					booking_items: data.items
						? {
								deleteMany: {},
								create: data.items.map((item: any) => ({
									item_type: item.item_type,
									item_id: item.item_id,
									name: item.name,
									duration: item.duration,
								})),
						  }
						: undefined,
				},
				include: {
					client: { select: { user_id: true, name: true, surname: true, phone: true, avatar: true } },
					staff: { select: { name: true, surname: true } },
					booking_items: true,
				},
			})
		},

		async delete(id: string): Promise<void> {
			await db.booking.delete({ where: { booking_id: id } })
		},

		async findRecipient(clientId: string) {
			return await db.user.findUnique({
				where: { user_id: clientId },
				select: { name: true, surname: true, email: true },
			})
		},
	} satisfies BookingsRepository
}
