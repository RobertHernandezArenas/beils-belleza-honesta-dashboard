import { createError } from 'h3'
import type { SalesRepository } from './ports'

export interface DeleteCartDeps {
	sales: SalesRepository
}

export async function deleteCart(deps: DeleteCartDeps, id: string): Promise<{ success: true }> {
	if (!id) {
		throw createError({ statusCode: 400, statusMessage: 'Cart ID is required' })
	}

	await deps.sales.deleteCart(id)
	return { success: true }
}

