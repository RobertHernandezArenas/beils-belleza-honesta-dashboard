import { createRateLimiter, resolveClientIp } from '../utils/rate-limit'

// Runs before auth (files run in alphabetical order): floods with fake tokens are limited too.

// Reverse proxies in front of Node whose X-Forwarded-For entries we trust
// (Plesk nginx = 1; Cloudflare + nginx = 2). 0 = direct connections, header ignored.
const TRUSTED_PROXY_HOPS = Number.parseInt(process.env.TRUSTED_PROXY_HOPS || '0', 10) || 0

// The whole salon usually shares one public IP, so the general limit leaves room for a team
const apiLimiter = createRateLimiter({ limit: 300, windowMs: 60_000 })
// Brute-force guard for the login (complements the per-account 3-attempt lockout)
const loginLimiter = createRateLimiter({ limit: 5, windowMs: 60_000 })

// Bound memory: drop expired windows every 5 minutes
setInterval(() => {
	apiLimiter.prune()
	loginLimiter.prune()
}, 5 * 60_000).unref()

export default defineEventHandler(event => {
	// Only apply to API routes
	if (!event.path.startsWith('/api/')) return

	const ip = resolveClientIp({
		remoteAddress: event.node.req.socket?.remoteAddress,
		forwardedFor: getRequestHeader(event, 'x-forwarded-for'),
		trustedHops: TRUSTED_PROXY_HOPS,
	})

	const isLogin = event.path.split('?')[0] === '/api/auth/login' && event.method === 'POST'
	const result = isLogin ? loginLimiter.hit(ip) : apiLimiter.hit(ip)
	const limit = isLogin ? 5 : 300

	setResponseHeader(event, 'X-RateLimit-Limit', limit.toString())
	setResponseHeader(event, 'X-RateLimit-Remaining', result.remaining.toString())
	setResponseHeader(event, 'X-RateLimit-Reset', Math.ceil(result.resetAt / 1000).toString())

	if (!result.allowed) {
		setResponseHeader(event, 'Retry-After', result.retryAfterSeconds)
		throw createError({
			statusCode: 429,
			statusMessage: isLogin
				? 'Demasiados intentos de inicio de sesión. Espera un minuto.'
				: 'Demasiadas peticiones. Inténtalo de nuevo en unos segundos.',
		})
	}
})
