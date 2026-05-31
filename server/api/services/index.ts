
import { z } from 'zod'

const serviceSchema = z.object({
	name: z.string().min(2, 'El nombre es obligatorio'),
	description: z.string().optional(),
	code: z.string().optional(),
	price: z.number().min(0, 'El precio no puede ser negativo'),
	duration: z.number().int().positive('La duración debe ser un número positivo'),
	status: z.enum(['activo', 'inactivo']).default('activo'),
})

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
			const body = await readBody(event)
			const parsedData = serviceSchema.parse(body)

			if (!parsedData.code || parsedData.code.trim() === '') {
				parsedData.code = await generateNextServiceCode()
			}

			const service = await prisma.service.create({
				data: parsedData,
			})

			return service
		} catch (error: any) {
			if (error instanceof z.ZodError) {
				throw createError({ statusCode: 400, statusMessage: error.message })
			}
			throw error
		}
	}
})
