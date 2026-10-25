/**
 * HTTP security headers for every response.
 *
 * The CSP starts in Report-Only mode: it never blocks anything, it only logs violations in
 * the browser console. Once the console stays clean while using the app, enforce it by
 * setting CSP_ENFORCE=true (no code change needed).
 */

const CSP_DIRECTIVES = [
	"default-src 'self'",
	// Nuxt injects inline payload/hydration scripts and components use inline styles
	"script-src 'self' 'unsafe-inline'",
	"style-src 'self' 'unsafe-inline'",
	// Fonts are self-hosted by @nuxt/fonts under /_fonts
	"font-src 'self' data:",
	// Avatars (ui-avatars), country flags (flagcdn), uploaded images, cropper blobs
	"img-src 'self' data: blob: https://ui-avatars.com https://flagcdn.com",
	"connect-src 'self'",
	"object-src 'none'",
	"base-uri 'self'",
	"form-action 'self'",
	"frame-ancestors 'none'",
].join('; ')

export function securityHeaders({ enforceCsp = false }: { enforceCsp?: boolean } = {}): Record<string, string> {
	return {
		'X-Content-Type-Options': 'nosniff',
		'X-Frame-Options': 'DENY',
		'Referrer-Policy': 'same-origin',
		'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
		// Ignored by browsers over plain HTTP, so it is safe in local development
		'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
		[enforceCsp ? 'Content-Security-Policy' : 'Content-Security-Policy-Report-Only']: CSP_DIRECTIVES,
	}
}
