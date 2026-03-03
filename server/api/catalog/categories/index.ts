import { defineEventHandler } from 'h3'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async event => {
	const categories = await prisma.category.findMany({
		orderBy: { name: 'asc' },
	})
	return categories
})
