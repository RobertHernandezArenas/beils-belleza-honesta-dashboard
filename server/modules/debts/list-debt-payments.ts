import { assertWithinSalesLimit, parseDateRange } from '../../utils/date-range'
import type { DebtPaymentWithDebtRecord, DebtsRepository } from './ports'

export interface ListDebtPaymentsDeps {
	debts: DebtsRepository
}

export async function listDebtPayments(
	deps: ListDebtPaymentsDeps,
	query: unknown,
): Promise<DebtPaymentWithDebtRecord[]> {
	const range = parseDateRange(query)
	const payments = await deps.debts.listDebtPayments(range)
	return assertWithinSalesLimit(payments)
}

