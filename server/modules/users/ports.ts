export interface UserSummaryRecord {
	user_id: string
	name: string
	surname: string | null
	email: string
	role: string
	status: string
	document_type: string | null
	document_number: string | null
	avatar: string | null
	locked_until: Date | null
}

export interface UserRecord extends UserSummaryRecord {
	password?: string
	phone: string | null
	birth_date?: Date | null
	token_version?: number
	failed_login_count?: number
	created_at?: Date
	updated_at?: Date
}

export interface UsersRepository {
	findMany(roles?: string[]): Promise<UserSummaryRecord[]>
	findById(id: string): Promise<UserRecord | null>
	findByEmail(email: string): Promise<UserRecord | null>
	countActiveAdmins(): Promise<number>
	create(data: any): Promise<any>
	update(id: string, data: any, revokeSessions: boolean): Promise<any>
	delete(id: string): Promise<void>
	unlock(id: string): Promise<boolean>
}

