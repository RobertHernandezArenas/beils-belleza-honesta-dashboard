import { join } from 'path'
import { readdir, stat } from 'fs/promises'

export default defineEventHandler(async (event) => {
	const query = getQuery(event)
	const category = (query.category as string) || 'imagenes'
	const type = (query.type as string) || ''

	const multimediaDir = join(process.cwd(), 'public', 'multimedia', category, type)
	
	try {
		const entries = await readdir(multimediaDir, { withFileTypes: true })
		const files = await Promise.all(
			entries
				.filter((entry) => entry.isFile())
				.map(async (entry) => {
					const filePath = join(multimediaDir, entry.name)
					const fileStat = await stat(filePath)
					return {
						name: entry.name,
						url: `/multimedia/${category}/${type ? type + '/' : ''}${entry.name}`,
						size: fileStat.size,
						mtime: fileStat.mtime,
					}
				})
		)

		return files.sort((a, b) => b.mtime.getTime() - a.mtime.getTime())
	} catch (err) {
		return []
	}
})
