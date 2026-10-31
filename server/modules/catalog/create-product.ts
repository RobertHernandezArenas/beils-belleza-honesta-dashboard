import { createError } from 'h3'
import type { ProductsRepository, NewProductInput, ProductRecord } from './ports'

export interface CreateProductDeps {
	products: ProductsRepository
}

export async function createProduct(deps: CreateProductDeps, data: NewProductInput): Promise<ProductRecord> {
	try {
		return await deps.products.create(data)
	} catch (rawError) {
		if ((rawError as { code?: string }).code === 'P2002') {
			throw createError({
				statusCode: 409,
				statusMessage: 'Ya existe un producto con ese SKU o código de barras',
			})
		}
		throw rawError
	}
}

