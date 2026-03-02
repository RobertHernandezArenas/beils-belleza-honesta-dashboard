import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async event => {
	const method = event.node.req.method

	if (method === 'GET') {
		const query = getQuery(event)
		const search = query.search as string | undefined

		const whereClause: any = {}

		if (search) {
			whereClause.OR = [
				{ name: { contains: search } },
				{ description: { contains: search } },
				{ code: { contains: search } },
			]
		}

		const services = await prisma.service.findMany({
			where: whereClause,
			orderBy: { created_at: 'desc' },
		})

		return services
	}

	if (method === 'POST') {
		const body = await readBody(event)

		const service = await prisma.service.create({
			data: body,
		})

		return service
	}
})
