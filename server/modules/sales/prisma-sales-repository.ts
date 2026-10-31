import type { PrismaClient } from '@prisma/client'
import { loadSaleCatalog } from '../../utils/sale-pricing'
import { asCouponTx } from '../../utils/coupons'
import { asConsumptionTx } from '../../utils/package-consumption'
import { SALES_FETCH_TAKE } from '../../utils/date-range'
import type { CartDetailRecord, OwnPackageQuery, SalesRepository, SaleUnitOfWork } from './ports'

type Tx = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0]

const unitOfWork = (tx: Tx): SaleUnitOfWork => ({
	couponTx: asCouponTx(tx),
	consumptionTx: asConsumptionTx(tx),

	completeBooking: bookingId =>
		tx.booking.update({ where: { booking_id: bookingId }, data: { status: 'COMPLETADA' } }),

	findUnlinkedBookingAround: (clientId, from, to) =>
		tx.booking.findFirst({
			where: {
				client_id: clientId,
				booking_date: { gte: from, lte: to },
				status: { notIn: ['CANCELADA', 'AUSENTE', 'cancelled', 'no_show'] },
				carts: { none: { status: 'completed' } },
			},
			orderBy: [
				{ booking_date: 'desc' },
				{ start_time: 'desc' },
			],
		}),

	createCart: ({ items, ...cart }) => tx.cart.create({ data: { ...cart, items: { create: items } } }),
	createDebt: debt => tx.debt.create({ data: debt }),

	deleteCartItems: cartId => tx.cartItem.deleteMany({ where: { cart_id: cartId } }),
	createCartItems: items => tx.cartItem.createMany({ data: items }),
	updateCart: (cartId, data) =>
		tx.cart.update({
			where: { cart_id: cartId },
			data,
			include: { items: true, debts: true },
		}) as unknown as Promise<CartDetailRecord>,
	updateDebt: (debtId, data) => tx.debt.update({ where: { debt_id: debtId }, data }),

	findClientPackageItem: id =>
		tx.clientPackageItem.findUnique({ where: { client_package_item_id: id } }).catch(() => null),
	findClientPackage: id =>
		tx.clientPackage.findUnique({ where: { client_package_id: id } }).catch(() => null),

	findOwnUsablePackageItem: ({ userId, itemId, cleanName, qty, now }: OwnPackageQuery) =>
		tx.clientPackageItem.findFirst({
			where: {
				client_package: usableOwnPackage(userId, now),
				quantity_remaining: { gte: qty },
				OR: [
					{ package_item_id: itemId },
					{ name: { contains: cleanName } },
				],
			},
		}),
	findOwnUsablePackage: ({ userId, itemId, cleanName, qty, now }: OwnPackageQuery) =>
		tx.clientPackage.findFirst({
			where: {
				...usableOwnPackage(userId, now),
				remaining_sessions: { gte: qty },
				AND: [{
					OR: [
						{ package_id: itemId },
						{ package: { name: { contains: cleanName } } },
					],
				}],
			},
		}),

	findCatalogPackage: packageId =>
		tx.package.findUnique({ where: { package_id: packageId }, include: { items: true } }),
	createClientPackage: data => tx.clientPackage.create({ data }),
	createClientPackageItems: data => tx.clientPackageItem.createMany({ data }),
})

const usableOwnPackage = (userId: string, now: Date) => ({
	user_id: userId,
	status: 'ACTIVE',
	OR: [{ expiry_date: null }, { expiry_date: { gt: now } }],
})

/** Prisma adapter of SalesRepository. Receives the client so callers decide which one (and tests can fake it). */
export function createPrismaSalesRepository(db: PrismaClient) {
	const repository: SalesRepository<unknown> = {
		loadCatalog: lines => loadSaleCatalog(db, lines),
		transaction: work => db.$transaction(tx => work(unitOfWork(tx))),
		findUserDocument: userId =>
			db.user.findUnique({ where: { user_id: userId }, select: { document_number: true } }),
		saveInvoice: (cartId, data) => db.cart.update({ where: { cart_id: cartId }, data }),
		markInvoiceError: cartId =>
			db.cart.update({ where: { cart_id: cartId }, data: { aeat_status: 'error' } }),
		findCartView: cartId =>
			db.cart.findUnique({
				where: { cart_id: cartId },
				include: {
					items: true,
					user: { select: { name: true, surname: true, avatar: true } },
					debts: { include: { payments: true } },
				},
			}),
		findCartById: cartId =>
			db.cart.findUnique({
				where: { cart_id: cartId },
				include: {
					user: { select: { name: true, surname: true, email: true, phone: true } },
					items: true,
					debts: { include: { payments: true } },
				},
			}) as unknown as Promise<CartDetailRecord | null>,
		findCartForUpdate: cartId =>
			db.cart.findUnique({
				where: { cart_id: cartId },
				include: { items: true, user: { select: { document_number: true } } },
			}) as unknown as Promise<CartDetailRecord | null>,
		deleteCart: async cartId => {
			await db.cart.delete({ where: { cart_id: cartId } })
		},
		listCarts: ({ status, created_at }) =>
			db.cart.findMany({
				where: {
					...(status ? { status } : {}),
					...(created_at ? { created_at } : {}),
				},
				include: {
					user: { select: { name: true, surname: true, email: true, phone: true, avatar: true, document_number: true } },
					items: true,
					debts: { include: { payments: true } },
				},
				orderBy: { created_at: 'desc' },
				take: SALES_FETCH_TAKE,
			}) as unknown as Promise<CartDetailRecord[]>,
		sumCompletedSales: async range => {
			const { _sum, _count } = await db.cart.aggregate({
				where: { status: 'completed', ...(range ? { created_at: range } : {}) },
				_sum: { total: true },
				_count: true,
			})
			return { total: _sum.total ?? 0, count: _count }
		},
	}
	return repository
}
