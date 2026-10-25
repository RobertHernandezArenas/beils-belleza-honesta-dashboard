/**
 * Rate limiting primitives (in-memory, single instance).
 *
 * Client IP: behind a reverse proxy (Plesk nginx) every request comes from 127.0.0.1, so the
 * real IP must be read from X-Forwarded-For. nginx's `$proxy_add_x_forwarded_for` APPENDS the
 * real address after whatever the client sent, so only the entries added by our own proxies
 * (the rightmost `trustedHops`) can be trusted. Taking the first entry would let anyone spoof it.
 */

export function resolveClientIp({
	remoteAddress,
	forwardedFor,
	trustedHops,
}: {
	remoteAddress: string | undefined
	forwardedFor: string | undefined
	trustedHops: number
}): string {
	const fallback = remoteAddress || 'unknown'
	if (trustedHops <= 0 || !forwardedFor) return fallback
	const chain = forwardedFor
		.split(',')
		.map(ip => ip.trim())
		.filter(Boolean)
	if (chain.length === 0) return fallback
	return chain[Math.max(0, chain.length - trustedHops)]!
}

export interface RateLimitResult {
	allowed: boolean
	remaining: number
	resetAt: number
	retryAfterSeconds: number
}

export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }) {
	const entries = new Map<string, { count: number; resetAt: number }>()

	const hit = (key: string, now = Date.now()): RateLimitResult => {
		let entry = entries.get(key)
		if (!entry || now >= entry.resetAt) {
			entry = { count: 0, resetAt: now + windowMs }
			entries.set(key, entry)
		}
		entry.count++
		return {
			allowed: entry.count <= limit,
			remaining: Math.max(0, limit - entry.count),
			resetAt: entry.resetAt,
			retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000),
		}
	}

	/** Drops windows that already expired (call periodically to bound memory). */
	const prune = (now = Date.now()) => {
		for (const [key, entry] of entries) {
			if (now >= entry.resetAt) entries.delete(key)
		}
	}

	return { hit, prune, size: () => entries.size }
}
