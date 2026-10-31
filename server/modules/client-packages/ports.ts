export interface ClientPackageItemRecord {
	client_package_item_id: string
	client_package_id: string
	package_item_id?: string | null
	name: string
	item_type: 'SERVICE' | 'PRODUCT'
	quantity_total: number
	quantity_remaining: number
	duration: number
}

export interface ClientPackageRecord {
	client_package_id: string
	user_id: string
	package_id: string
	total_sessions: number
	remaining_sessions: number
	expiry_date: Date | null
	custom_price: number | null
	status: string
	created_at?: Date
	updated_at?: Date
	package?: any
	items?: ClientPackageItemRecord[]
	user?: { user_id: string; name: string; surname: string | null }
	shares?: Array<{
		client_package_share_id?: string
		client_package_id: string
		user_id: string
		user?: { user_id: string; name: string; surname: string | null; avatar?: string | null }
	}>
}

export interface ClientPackagesRepository {
	findUsable(clientId: string, now: Date): Promise<ClientPackageRecord[]>
	findByIdAndOwner(packageId: string, clientId: string): Promise<ClientPackageRecord | null>
	findCatalogPackage(packageId: string): Promise<any | null>
	verifyClientExists(clientId: string): Promise<boolean>
	verifyClientsExist(userIds: string[]): Promise<boolean>
	assignPackage(data: {
		user_id: string
		package_id: string
		total_sessions: number
		remaining_sessions: number
		expiry_date: Date | null
		custom_price: number | null
		status: string
		items?: Array<{
			package_item_id?: string
			name: string
			item_type: 'SERVICE' | 'PRODUCT'
			quantity: number
			duration: number
		}>
	}): Promise<ClientPackageRecord>
	updatePackage(
		packageId: string,
		data: {
			total_sessions?: number
			remaining_sessions?: number
			custom_price?: number | null
			expiry_date?: Date | null
			status?: string
		},
		items?: Array<{
			client_package_item_id: string
			quantity_total?: number
			quantity_remaining?: number
		}>,
	): Promise<ClientPackageRecord>
	deletePackage(packageId: string): Promise<void>
	createShares(packageId: string, userIds: string[]): Promise<any[]>
	deleteShare(packageId: string, userId: string, ownerId: string): Promise<{ count: number }>
}

