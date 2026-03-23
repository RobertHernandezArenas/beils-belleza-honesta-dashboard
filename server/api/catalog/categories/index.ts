import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async event => {
	const categories = await prisma.category.findMany({
		orderBy: { name: 'asc' },
		include: {
			subcategories: {
				select: { subcategory_id: true, name: true },
			},
			_count: {
				select: { subcategories: true },
			},
		},
	})
	return categories
})
