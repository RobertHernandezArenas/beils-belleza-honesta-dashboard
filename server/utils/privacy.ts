export const maskDocument = (doc: string | null | undefined): string => {
	if (!doc) return ''
	if (doc.length <= 4) return '****'
	return `****${doc.slice(-4)}`
}
