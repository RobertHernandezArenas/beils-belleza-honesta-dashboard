export interface PackageItemRecord {
	package_item_id?: string
	package_id?: string
	item_type: 'SERVICE' | 'PRODUCT'
	item_id: string
	name: string
	quantity: number
	duration: number
}

export interface CatalogPackageRecord {
	package_id: string
	name: string
	description: string | null
	type: 'INDIVIDUAL' | 'MIXTO'
	price: number
	total_sessions: number
	service_id: string | null
	status: string
	created_at?: Date
	updated_at?: Date
	items?: PackageItemRecord[]
}

export interface PackageUnitOfWork {
	deleteItems(packageId: string): Promise<void>
	updatePackage(
		packageId: string,
		data: {
			name: string
			description?: string | null
			type: 'INDIVIDUAL' | 'MIXTO'
			price: number
			total_sessions: number
			service_id?: string | null
		},
		items?: PackageItemRecord[],
	): Promise<CatalogPackageRecord>
}

export interface PackagesRepository {
	findActive(): Promise<CatalogPackageRecord[]>
	findById(id: string): Promise<CatalogPackageRecord | null>
	create(
		data: {
			name: string
			description?: string | null
			type: 'INDIVIDUAL' | 'MIXTO'
			price: number
			total_sessions: number
			service_id?: string | null
		},
		items?: PackageItemRecord[],
	): Promise<CatalogPackageRecord>
	deactivate(id: string): Promise<void>
	transaction<T>(work: (uow: PackageUnitOfWork) => Promise<T>): Promise<T>
}

