export interface AuthUserRecord {
	user_id: string
	email: string
	password?: string
	name: string
	surname: string | null
	role: string
	status: string
	document_type: string | null
	document_number: string | null
	phone: string | null
	token_version: number
	failed_login_count: number
	locked_until: Date | null
	created_at: Date
}

export interface AuthRepository {
	findByEmail(email: string): Promise<AuthUserRecord | null>
	findById(userId: string): Promise<AuthUserRecord | null>
	incrementFailedAttempts(userId: string): Promise<number>
	lockAccount(userId: string, lockedUntil: Date): Promise<void>
	resetFailedAttempts(userId: string): Promise<void>
}

