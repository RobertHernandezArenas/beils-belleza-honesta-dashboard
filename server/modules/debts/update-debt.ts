import { createError } from 'h3'
import { parseDebtUpdate } from '../../utils/catalog-validation'
import type { DebtDetailRecord, DebtsRepository } from './ports'

export interface UpdateDebtDeps {
	debts: DebtsRepository
}

export async function updateDebt(deps: UpdateDebtDeps, id: string, rawInput: unknown): Promise<DebtDetailRecord> {
	if (!id) {
		throw createError({ statusCode: 400, statusMessage: 'Debt ID is required' })
	}

	const body = parseDebtUpdate(rawInput)

	const current = await deps.debts.findDebtAmount(id)
	if (!current) {
		throw createError({ statusCode: 404, statusMessage: 'Deuda no encontrada' })
	}

	const payload: Record<string, unknown> = { status: body.status, notes: body.notes }

	if (body.remaining !== undefined) {
		if (body.remaining > current.amount) {
			throw createError({
				statusCode: 400,
				statusMessage: 'El saldo pendiente no puede superar el importe de la deuda',
			})
		}
		const remaining = Number(body.remaining.toFixed(2))
		payload.remaining = remaining
		if (remaining <= 0) {
			payload.remaining = 0
			payload.status = 'paid'
		}
	}

	if (body.due_date) {
		payload.due_date = new Date(body.due_date)
	}

	return await deps.debts.updateDebt(id, payload)
}

