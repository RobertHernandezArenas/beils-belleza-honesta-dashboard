/** Internal auth columns that must never leave the server in an API response. */
const INTERNAL_USER_FIELDS = new Set(['password', 'refresh_token', 'token_version', 'failed_login_count', 'locked_until'])

type InternalField = 'password' | 'refresh_token' | 'token_version' | 'failed_login_count' | 'locked_until'

export function toPublicUser<T extends object>(user: T): Omit<T, InternalField> {
	return Object.fromEntries(Object.entries(user).filter(([key]) => !INTERNAL_USER_FIELDS.has(key))) as Omit<T, InternalField>
}
