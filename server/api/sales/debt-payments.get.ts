import { createPrismaDebtsRepository } from '../../modules/debts/prisma-debts-repository'
import { listDebtPayments } from '../../modules/debts/list-debt-payments'

export default defineEventHandler(async event => {
	const repo = createPrismaDebtsRepository(prisma)
	return await listDebtPayments({ debts: repo }, getQuery(event))
})
