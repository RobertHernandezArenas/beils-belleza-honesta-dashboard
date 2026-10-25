import { parseServiceCreate } from '../../utils/catalog-validation'
import type { Prisma } from '@prisma/client'

async function generateNextServiceCode(): Promise<string> {
	const services = await prisma.service.findMany({
		where: {
			code: {
				startsWith: 'SVC-',
			},
		},
		select: {
			code: true,
		},
	})

	let maxNumber = 0
	for (const s of services) {
		if (s.code) {
			const match = s.code.match(/^SVC-(\d+)$/)
			if (match && match[1]) {
				const num = parseInt(match[1], 10)
				if (num > maxNumber) {
					maxNumber = num
				}
			}
		}
	}

	const nextNumber = maxNumber + 1
	const paddedNumber = String(nextNumber).padStart(2, '0')
	return `SVC-${paddedNumber}`
}

export default defineEventHandler(async event => {
	const method = event.node.req.method

	if (method === 'GET') {
		const query = getQuery(event)
		const search = query.search as string | undefined

		const whereClause: Prisma.ServiceWhereInput = {}

		if (search) {
			whereClause.OR = [
				{ name: { contains: search } },
				{ description: { contains: search } },
				{ code: { contains: search } },
			]
		}

		const services = await prisma.service.findMany({
			where: whereClause,
			select: {
				service_id: true,
				name: true,
				code: true,
				price: true,
				duration: true,
				status: true,
			},
			orderBy: { created_at: 'desc' },
		})

		return services
	}

	if (method === 'POST') {
		try {
			// Shared schema (also validates tax_rate, which used to be dropped on create)
			const parsedData = parseServiceCreate(await readBody(event))

			if (!parsedData.code) {
				parsedData.code = await generateNextServiceCode()
			}

			const service = await prisma.service.create({
				data: parsedData,
			})

			return service
		} catch (rawError) {
			if ((rawError as { code?: string }).code === 'P2002') {
				throw createError({ statusCode: 409, statusMessage: 'Ya existe un servicio con ese código' })
			}
			throw rawError
		}
	}
})
