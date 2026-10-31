import { createError } from 'h3'
import type { DebtsRepository } from './ports'

export interface DeleteDebtDeps {
	debts: DebtsRepository
}

export async function deleteDebt(deps: DeleteDebtDeps, id: string): Promise<{ success: true }> {
	if (!id) {
		throw createError({ statusCode: 400, statusMessage: 'Debt ID is required' })
	}

	await deps.debts.deleteDebt(id)
	return { success: true }
}

