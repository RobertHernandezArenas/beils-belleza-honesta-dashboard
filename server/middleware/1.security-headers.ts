import { securityHeaders } from '../utils/security-headers'

const HEADERS = securityHeaders({ enforceCsp: process.env.CSP_ENFORCE === 'true' })

// Runs after the rate limiter and before auth, so error responses carry the headers too
export default defineEventHandler(event => {
	setResponseHeaders(event, HEADERS)
})
