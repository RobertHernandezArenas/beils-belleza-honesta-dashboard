import { SESSION_COOKIE, sessionCookieOptions } from '../../utils/session-policy'

/** Clears the httpOnly session cookie (the browser can't delete it from JavaScript). */
export default defineEventHandler(event => {
	const { path, secure, sameSite, httpOnly } = sessionCookieOptions()
	deleteCookie(event, SESSION_COOKIE, { path, secure, sameSite, httpOnly })
	return { success: true }
})
