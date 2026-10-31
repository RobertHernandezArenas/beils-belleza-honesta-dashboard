import { createError } from 'h3'
import type { CartDetailRecord, SalesRepository } from './ports'

export interface GetCartDeps {
	sales: SalesRepository
}

export async function getCart(deps: GetCartDeps, id: string): Promise<CartDetailRecord> {
	if (!id) {
		throw createError({ statusCode: 400, statusMessage: 'Cart ID is required' })
	}

	const cart = await deps.sales.findCartById(id)
	if (!cart) {
		throw createError({ statusCode: 404, statusMessage: 'Cart not found' })
	}

	return cart
}

