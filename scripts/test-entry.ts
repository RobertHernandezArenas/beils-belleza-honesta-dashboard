async function run() {
	const html = await fetch('http://localhost:3000/').then(r => r.text())
	const matches = html.match(/src="([^"]*entry[^"]*)"/g)
	console.log('Matches:', matches)
	if (matches) {
		for (const m of matches) {
			const url = m.replace('src="', '').replace('"', '')
			console.log('Testing URL:', url)
			const res = await fetch('http://localhost:3000' + url)
			console.log('Status:', res.status, res.headers.get('content-type'))
		}
	}
}

run().catch(console.error)

