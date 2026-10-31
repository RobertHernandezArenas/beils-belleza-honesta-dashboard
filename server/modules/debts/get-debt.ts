import { createError } from 'h3'
import type { DebtDetailRecord, DebtsRepository } from './ports'

export interface GetDebtDeps {
	debts: DebtsRepository
}

export async function getDebt(deps: GetDebtDeps, id: string): Promise<DebtDetailRecord> {
	if (!id) {
		throw createError({ statusCode: 400, statusMessage: 'Debt ID is required' })
	}

	const debt = await deps.debts.findDebtById(id)
	if (!debt) {
		throw createError({ statusCode: 404, statusMessage: 'Debt not found' })
	}

	return debt
}

