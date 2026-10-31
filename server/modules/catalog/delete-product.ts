import type { ProductsRepository } from './ports'

export interface DeleteProductDeps {
	products: ProductsRepository
}

export async function deleteProduct(
	deps: DeleteProductDeps,
	{ id }: { id: string },
): Promise<{ success: true }> {
	await deps.products.delete(id)
	return { success: true }
}

