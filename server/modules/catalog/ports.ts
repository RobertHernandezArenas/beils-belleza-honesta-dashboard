export interface ProductSummary {
	product_id: string
	name: string
	sku: string | null
	barcode: string | null
	image_url: string | null
	price: number
	stock: number
	min_stock: number
	status: string
}

export interface ProductRecord extends ProductSummary {
	description: string | null
	tax_rate: number
	created_at: Date
	updated_at: Date
}

export interface ServiceSummary {
	service_id: string
	name: string
	code: string | null
	price: number
	duration: number
	status: string
}

export interface ServiceRecord extends ServiceSummary {
	description: string | null
	tax_rate: number
	created_at: Date
	updated_at: Date
}

export type NewProductInput = {
	name: string
	description?: string | null
	sku?: string | null
	barcode?: string | null
	price: number
	tax_rate?: number
	stock?: number
	min_stock?: number
	image_url?: string | null
	status?: 'activo' | 'inactivo'
}

export type UpdateProductInput = Partial<NewProductInput>

export type NewServiceInput = {
	name: string
	description?: string | null
	code?: string | null
	price: number
	tax_rate?: number
	duration: number
	status?: 'activo' | 'inactivo'
}

export type UpdateServiceInput = Partial<NewServiceInput>

export interface ProductsRepository {
	findMany(search?: string): Promise<ProductSummary[]>
	findById(id: string): Promise<ProductRecord | null>
	create(data: NewProductInput): Promise<ProductRecord>
	update(id: string, data: UpdateProductInput): Promise<ProductRecord>
	delete(id: string): Promise<void>
}

export interface ServicesRepository {
	findMany(search?: string): Promise<ServiceSummary[]>
	findById(id: string): Promise<ServiceRecord | null>
	findExistingSvcCodes(): Promise<string[]>
	create(data: NewServiceInput): Promise<ServiceRecord>
	update(id: string, data: UpdateServiceInput): Promise<ServiceRecord>
	delete(id: string): Promise<void>
}

