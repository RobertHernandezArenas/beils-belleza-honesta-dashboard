import { createError } from 'h3'

/**
 * Debt payments. The balance update is optimistic: it only applies if the debt still has
 * the balance/status that was read, so two concurrent payments can't both be recorded
 * against the same balance (lost update). Run inside the payment transaction: the 409
 * rolls back the payment record too.
 */

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100

export function computeDebtPayment(remaining: number, amount: number) {
	const paymentAmount = round2(Math.min(amount, remaining))
	// A sub-cent leftover means the debt is settled (checked before rounding, which could lift it to 0.01)
	const leftover = remaining - paymentAmount
	const newRemaining = leftover < 0.01 ? 0 : round2(leftover)
	return { paymentAmount, newRemaining, newStatus: newRemaining <= 0 ? 'paid' : 'partial' } as const
}

export interface DebtTx {
	debt: {
		updateMany(args: {
			where: { debt_id: string; remaining: number; status: string }
			data: { remaining: number; status: string }
		}): Promise<{ count: number }>
	}
}

export const asDebtTx = (tx: unknown) => tx as DebtTx

export async function commitDebtPayment(
	tx: DebtTx,
	{
		debtId,
		expected,
		newRemaining,
		newStatus,
	}: { debtId: string; expected: { remaining: number; status: string }; newRemaining: number; newStatus: string },
) {
	const { count } = await tx.debt.updateMany({
		where: { debt_id: debtId, remaining: expected.remaining, status: expected.status },
		data: { remaining: newRemaining, status: newStatus },
	})
	if (count === 0) {
		throw createError({
			statusCode: 409,
			statusMessage: 'La deuda cambió mientras se procesaba el pago. Actualiza y vuelve a intentarlo.',
		})
	}
}
