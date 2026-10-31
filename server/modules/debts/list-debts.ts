import type { DebtListItem, DebtsRepository } from './ports'

export interface ListDebtsDeps {
	debts: DebtsRepository
}

export async function listDebts(deps: ListDebtsDeps, query: { status?: string }): Promise<DebtListItem[]> {
	const status = typeof query.status === 'string' ? query.status : undefined
	return await deps.debts.listDebts({ status })
}

