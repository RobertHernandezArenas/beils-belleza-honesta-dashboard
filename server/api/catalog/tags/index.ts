import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async event => {
	const tags = await prisma.tag.findMany({
		orderBy: { name: 'asc' },
	})
	return tags
})
