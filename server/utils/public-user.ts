/** Internal auth columns that must never leave the server in an API response. */
const INTERNAL_USER_FIELDS = ['password', 'refresh_token', 'token_version', 'failed_login_count', 'locked_until'] as const

type InternalField = (typeof INTERNAL_USER_FIELDS)[number]

export function toPublicUser<T extends object>(user: T): Omit<T, InternalField> {
	const copy = { ...user } as Record<string, unknown>
	for (const field of INTERNAL_USER_FIELDS) delete copy[field]
	return copy as Omit<T, InternalField>
}
