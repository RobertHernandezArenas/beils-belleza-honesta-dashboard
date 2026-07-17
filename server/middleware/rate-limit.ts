const requestCounts = new Map<string, { count: number; resetAt: number }>()

const LIMIT = 100 // 100 requests
const WINDOW_MS = 60 * 1000 // per 1 minute

export default defineEventHandler((event) => {
    // Only apply to API routes
    if (!event.path.startsWith('/api/')) return

    const ip = getRequestIP(event) || 'unknown'
    const now = Date.now()

    let record = requestCounts.get(ip)

    if (!record) {
        record = { count: 1, resetAt: now + WINDOW_MS }
        requestCounts.set(ip, record)
    } else {
        if (now > record.resetAt) {
            // Reset window
            record.count = 1
            record.resetAt = now + WINDOW_MS
        } else {
            record.count++
        }
    }

    // Check if limit exceeded
    if (record.count > LIMIT) {
        throw createError({
            statusCode: 429,
            statusMessage: 'Too Many Requests',
            message: 'Rate limit exceeded. Please try again later.'
        })
    }

    // Optionally set headers
    setResponseHeader(event, 'X-RateLimit-Limit', LIMIT.toString())
    setResponseHeader(event, 'X-RateLimit-Remaining', Math.max(0, LIMIT - record.count).toString())
    setResponseHeader(event, 'X-RateLimit-Reset', Math.ceil(record.resetAt / 1000).toString())
})
