import { PRIVATE_FILES_PREFIX } from '../../utils/upload-storage'

/**
 * Old public URLs (/uploads/...) keep working: once files move to private storage this
 * redirects to the authenticated endpoint, which only staff can open.
 */
export default defineEventHandler(event => {
	const path = getRouterParam(event, 'path') || ''
	return sendRedirect(event, `${PRIVATE_FILES_PREFIX}/${path}`, 301)
})
