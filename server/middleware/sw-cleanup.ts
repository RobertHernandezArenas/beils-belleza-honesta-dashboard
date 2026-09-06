export default defineEventHandler((event) => {
	const path = event.path || ''
	if (path.includes('886227b7382034560f94666fbef42c9e')) {
		const fixedPath = path.replace('886227b7382034560f94666fbef42c9e', 'f4886a37ea0f7730d2308c3dc13233d6')
		return sendRedirect(event, fixedPath, 302)
	}
	if (path.includes('workbox') || path.endsWith('.js.map')) {
		setResponseStatus(event, 204)
		return ''
	}
})

