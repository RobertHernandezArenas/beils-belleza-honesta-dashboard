import { createError } from 'h3'
import type { ProductsRepository, UpdateProductInput, ProductRecord } from './ports'

export interface UpdateProductDeps {
	products: ProductsRepository
}

export async function updateProduct(
	deps: UpdateProductDeps,
	{ id, data }: { id: string; data: UpdateProductInput },
): Promise<ProductRecord> {
	try {
		return await deps.products.update(id, data)
	} catch (rawError) {
		const code = (rawError as { code?: string }).code
		if (code === 'P2002') {
			throw createError({
				statusCode: 409,
				statusMessage: 'Ya existe un producto con ese SKU o código de barras',
			})
		}
		if (code === 'P2025') {
			throw createError({
				statusCode: 404,
				statusMessage: 'Product not found',
			})
		}
		throw rawError
	}
}

