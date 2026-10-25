/** Minimum HS256 key length recommended (256 bits). */
const MIN_SECRET_LENGTH = 32

/**
 * Resolves the JWT signing secret. There is deliberately no fallback value: a missing
 * secret aborts startup, otherwise anyone could forge tokens with a value from the repo.
 * Short secrets abort in production and only warn elsewhere (so local dev keeps working).
 */
export function resolveJwtSecret(
	env: Record<string, string | undefined>,
	warn: (message: string) => void = console.warn,
): string {
	const secret = env.JWT_SECRET?.trim()
	if (!secret) {
		throw new Error('JWT_SECRET is not set: refusing to start without a signing secret')
	}
	if (secret.length < MIN_SECRET_LENGTH) {
		const message = `JWT_SECRET must be at least ${MIN_SECRET_LENGTH} characters (got ${secret.length})`
		if (env.NODE_ENV === 'production') throw new Error(message)
		warn(`[security] ${message}. Rotate it before deploying.`)
	}
	return secret
}
