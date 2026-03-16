import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async event => {
	const categories = await prisma.category.findMany({
		orderBy: { name: 'asc' },
		include: {
			subcategories: {
				select: { subcategory_id: true, name: true },
				take: 4, // Fetch at most 4 to prevent huge payloads for UI preview
			},
			_count: {
				select: { subcategories: true },
			},
		},
	})
	return categories
})
