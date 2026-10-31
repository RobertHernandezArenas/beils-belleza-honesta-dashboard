import { createError } from 'h3'
import type { ProductsRepository, ProductRecord } from './ports'

export interface GetProductDeps {
	products: ProductsRepository
}

export async function getProduct(deps: GetProductDeps, { id }: { id: string }): Promise<ProductRecord> {
	const product = await deps.products.findById(id)
	if (!product) {
		throw createError({ statusCode: 404, statusMessage: 'Product not found' })
	}
	return product
}

