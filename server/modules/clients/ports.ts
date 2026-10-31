/** What the client use cases need from storage. Plain TypeScript: no Prisma, no h3. */

export interface NewClientInput {
	email?: string
	name: string
	surname?: string
	phone?: string
	address?: string
	city?: string
	country?: string
	postal_code?: string
	gender?: string
	birth_date?: string
	document_type?: 'DNI' | 'PASSPORT' | 'NIE'
	document_number?: string
	status?: 'ON' | 'OFF'
	avatar?: string
	annotations?: string
	user_id?: string
}

export interface UpdateClientInput {
	email?: string
	name?: string
	surname?: string
	phone?: string
	address?: string
	city?: string
	country?: string
	postal_code?: string
	gender?: string
	birth_date?: string
	document_type?: 'DNI' | 'PASSPORT' | 'NIE'
	document_number?: string
	status?: 'ON' | 'OFF'
	avatar?: string
	annotations?: string
}

export interface ClientRecord {
	user_id: string
	email: string
	name: string
	surname: string
	phone: string
	address: string
	city: string
	country: string
	postal_code: string
	gender: string
	birth_date: Date
	document_type: string
	document_number: string
	status: string
	avatar: string
	annotations: string
	role: string
	created_at?: Date
	updated_at?: Date
	[key: string]: unknown
}

export interface ListClientsQuery {
	search?: string
	status?: string
	skip: number
	limit: number
	page: number
}

export interface ClientListItem {
	user_id: string
	name: string
	surname: string
	email: string
	phone: string
	document_type: string
	document_number: string
	status: string
	avatar: string
	_count?: {
		client_bookings: number
		consents: number
	}
	[key: string]: unknown
}

export interface ListClientsResult {
	data: ClientListItem[]
	total: number
}

export interface ClientsUnitOfWork {
	deleteClientCascade(userId: string): Promise<void>
}

export interface ClientsRepository {
	findById(id: string): Promise<ClientRecord | null>
	findByEmail(email: string): Promise<ClientRecord | null>
	findOtherByEmail(email: string, excludeUserId: string): Promise<ClientRecord | null>
	create(data: {
		email: string
		name: string
		surname: string
		phone: string
		address: string
		city: string
		country: string
		postal_code: string
		gender: string
		birth_date: Date
		document_type: 'DNI' | 'PASSPORT' | 'NIE'
		document_number: string
		status: 'ON' | 'OFF'
		avatar: string
		annotations: string
		user_id?: string
		password: string
		role: 'CLIENT'
	}): Promise<ClientRecord>
	update(id: string, data: Record<string, unknown>): Promise<ClientRecord | null>
	list(query: ListClientsQuery): Promise<ListClientsResult>
	findDetail(id: string): Promise<Record<string, any> | null>
	transaction<T>(work: (uow: ClientsUnitOfWork) => Promise<T>): Promise<T>
}
