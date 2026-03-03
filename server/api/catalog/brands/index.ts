import { defineEventHandler } from 'h3'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async event => {
	const brands = await prisma.brand.findMany({
		orderBy: { name: 'asc' },
	})
	return brands
})
