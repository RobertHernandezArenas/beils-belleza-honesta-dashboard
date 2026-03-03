import { defineEventHandler } from 'h3'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async event => {
	const subcategories = await prisma.subcategory.findMany({
		orderBy: { name: 'asc' },
	})
	return subcategories
})
