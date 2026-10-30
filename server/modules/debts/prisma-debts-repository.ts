import type { PrismaClient } from '@prisma/client'
import { asDebtTx } from '../../utils/debt-payment'
import type { DebtsRepository, DebtUnitOfWork } from './ports'

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
	} satisfies DebtsRepository
}
