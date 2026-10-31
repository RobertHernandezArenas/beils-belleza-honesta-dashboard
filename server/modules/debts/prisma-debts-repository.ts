import type { Prisma, PrismaClient } from '@prisma/client'
import { asDebtTx } from '../../utils/debt-payment'
import { SALES_FETCH_TAKE } from '../../utils/date-range'
import type {
	DebtDetailRecord,
	DebtListItem,
	DebtPaymentWithDebtRecord,
	DebtsRepository,
	DebtUnitOfWork,
} from './ports'

type Tx = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0]

const unitOfWork = (tx: Tx): DebtUnitOfWork => ({
	debtTx: asDebtTx(tx),

	findDebt: debtId => tx.debt.findUnique({ where: { debt_id: debtId } }),
	createPayment: payment => tx.debtPayment.create({ data: payment }),
	listPayments: debtId =>
		tx.debtPayment.findMany({ where: { debt_id: debtId }, orderBy: { payment_date: 'asc' } }),

	findCartForPayoff: cartId =>
		tx.cart.findUnique({
			where: { cart_id: cartId },
			include: { user: { select: { document_number: true, user_id: true } } },
		}),
	completeCart: (cartId, data) => tx.cart.update({ where: { cart_id: cartId }, data }),
})

/** Prisma adapter of DebtsRepository. Receives the client so callers decide which one (and tests can fake it). */
export function createPrismaDebtsRepository(db: PrismaClient) {
	return {
		transaction: work => db.$transaction(tx => work(unitOfWork(tx))),
		saveInvoice: (cartId, data) => db.cart.update({ where: { cart_id: cartId }, data }),
		markInvoiceError: cartId =>
			db.cart.update({ where: { cart_id: cartId }, data: { aeat_status: 'error' } }),
		listDebts: ({ status }) => {
			const whereClause: Prisma.DebtWhereInput = {}
			if (status) {
				if (status === 'pending') {
					whereClause.status = { in: ['pending', 'partial'] }
				} else {
					whereClause.status = status
				}
			}
			return db.debt.findMany({
				where: whereClause,
				include: {
					user: { select: { name: true, surname: true, phone: true } },
					payments: { orderBy: { payment_date: 'asc' } },
					cart: {
						select: { total: true, created_at: true, invoice_number: true, payment_method: true, items: true },
					},
				},
				orderBy: { created_at: 'desc' },
			}) as unknown as Promise<DebtListItem[]>
		},
		findCartForDebt: cartId =>
			db.cart.findUnique({ where: { cart_id: cartId }, select: { user_id: true, total: true } }),
		createDebt: data =>
			db.debt.create({
				data,
				include: { user: { select: { name: true, surname: true } } },
			}) as unknown as Promise<DebtDetailRecord>,
		findDebtById: id =>
			db.debt.findUnique({
				where: { debt_id: id },
				include: { user: { select: { name: true, surname: true, email: true } }, cart: true },
			}) as unknown as Promise<DebtDetailRecord | null>,
		findDebtAmount: id =>
			db.debt.findUnique({ where: { debt_id: id }, select: { amount: true } }),
		updateDebt: (id, data) =>
			db.debt.update({
				where: { debt_id: id },
				data,
				include: { cart: true },
			}) as unknown as Promise<DebtDetailRecord>,
		deleteDebt: async id => {
			await db.debt.delete({ where: { debt_id: id } })
		},
		listDebtPayments: range =>
			db.debtPayment.findMany({
				where: range ? { payment_date: range } : undefined,
				include: {
					debt: {
						include: {
							user: { select: { name: true, surname: true, email: true, phone: true, document_number: true } },
							payments: { orderBy: { payment_date: 'asc' } },
							cart: {
								include: {
									items: true,
									user: { select: { name: true, surname: true, email: true, phone: true, document_number: true } },
									debts: { include: { payments: { orderBy: { payment_date: 'asc' } } } },
								},
							},
						},
					},
				},
				orderBy: { payment_date: 'desc' },
				take: SALES_FETCH_TAKE,
			}) as unknown as Promise<DebtPaymentWithDebtRecord[]>,
	} satisfies DebtsRepository
}
