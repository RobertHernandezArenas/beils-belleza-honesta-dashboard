// Senior Architect pattern: Self-unregistering script to kill zombie PWA service workers in dev
export default defineEventHandler((event) => {
	setResponseHeader(event, 'Content-Type', 'application/javascript')
	setResponseHeader(event, 'Cache-Control', 'no-store, no-cache, must-revalidate')
	return `
self.addEventListener('install', (e) => {
	self.skipWaiting();
});

self.addEventListener('activate', (e) => {
	e.waitUntil(
		self.registration.unregister().then(() => {
			return self.clients.matchAll();
		}).then((clients) => {
			clients.forEach((client) => client.navigate(client.url));
		})
	);
});
`
})
