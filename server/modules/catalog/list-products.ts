import type { ProductsRepository, ProductSummary } from './ports'

export interface ListProductsDeps {
	products: ProductsRepository
}

export async function listProducts(deps: ListProductsDeps, { search }: { search?: string } = {}): Promise<ProductSummary[]> {
	return await deps.products.findMany(search)
}

