export interface IProduct {
	product_id: string
	name: string
	description: string | null
	sku: string | null
	barcode: string | null
	price: number
	tax_rate: number
	stock: number
	min_stock: number
	image_url: string | null
	status: string
	category_id: string | null
	subcategory_id: string | null
	created_at: string | Date
	updated_at: string | Date
}

export interface IService {
	service_id: string
	name: string
	description: string | null
	code: string | null
	price: number
	tax_rate: number
	duration: number
	status: string
	created_at: string | Date
	updated_at: string | Date
}

export interface IPack {
	pack_id: string
	name: string
	description: string | null
	code: string | null
	price: number
	tax_rate: number
	status: string
	image_url: string | null
	products?: any[]
	services?: any[]
	created_at: string | Date
	updated_at: string | Date
}
