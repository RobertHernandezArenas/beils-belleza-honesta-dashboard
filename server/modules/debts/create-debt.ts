import { createError } from 'h3'
import { parseDebtCreate, resolveDebtAmount } from '../../utils/catalog-validation'
import type { DebtDetailRecord, DebtsRepository } from './ports'

export interface CreateDebtDeps {
	debts: DebtsRepository
}

export async function createDebt(deps: CreateDebtDeps, rawInput: unknown): Promise<DebtDetailRecord> {
	const input = parseDebtCreate(rawInput)

	const cart = input.cart_id
		? await deps.debts.findCartForDebt(input.cart_id)
		: null

	if (input.cart_id && !cart) {
		throw createError({ statusCode: 404, statusMessage: 'Ticket no encontrado' })
	}

	const amount = resolveDebtAmount({ userId: input.user_id, requestedAmount: input.amount, cart })

	return await deps.debts.createDebt({
		user_id: input.user_id,
		cart_id: input.cart_id ?? null,
		amount,
		remaining: amount,
		status: 'pending',
		notes: input.notes ?? null,
		due_date: input.due_date ? new Date(input.due_date) : null,
	})
}

