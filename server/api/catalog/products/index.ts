import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async event => {
	const method = event.node.req.method

	if (method === 'GET') {
		const query = getQuery(event)
		const category_id = query.category_id as string | undefined
		const subcategory_id = query.subcategory_id as string | undefined
		const brand_id = query.brand_id as string | undefined
		const search = query.search as string | undefined

		const whereClause: any = {}

		if (category_id) whereClause.category_id = category_id
		if (subcategory_id) whereClause.subcategory_id = subcategory_id
		if (brand_id) whereClause.brand_id = brand_id

		if (search) {
			whereClause.OR = [
				{ name: { contains: search } },
				{ description: { contains: search } },
				{ sku: { contains: search } },
				{ barcode: { contains: search } },
			]
		}

		const products = await prisma.product.findMany({
			where: whereClause,
			include: {
				brand: { select: { name: true } },
				category: { select: { name: true } },
				subcategory: { select: { name: true } },
				tags: {
					include: {
						tag: { select: { name: true } },
					},
				},
			},
			orderBy: { created_at: 'desc' },
		})

		return products.map(p => ({
			...p,
			tags: p.tags.map(t => ({ tag_id: t.tag.name, name: t.tag.name })), // flatten for front-end
		}))
	}

	if (method === 'POST') {
		const body = await readBody(event)
		const { tags, ...productData } = body

		// Remove auto-generated empty fields if they come empty from frontend
		if (productData.brand_id === '') delete productData.brand_id
		if (productData.category_id === '') delete productData.category_id
		if (productData.subcategory_id === '') delete productData.subcategory_id

		const product = await prisma.product.create({
			data: {
				...productData,
				tags:
					tags && tags.length > 0
						? {
								create: tags.map((tagId: string) => ({
									tag: { connect: { tag_id: tagId } },
								})),
							}
						: undefined,
			},
			include: {
				brand: { select: { name: true } },
				category: { select: { name: true } },
				subcategory: { select: { name: true } },
				tags: { include: { tag: true } },
			},
		})

		return product
	}
})
