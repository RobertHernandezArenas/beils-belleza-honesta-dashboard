import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async event => {
	const subcategories = await prisma.subcategory.findMany({
		include: {
			category: {
				select: {
					name: true,
				},
			},
		},
		orderBy: { name: 'asc' },
	})
	return subcategories
})
