import { requireAdmin } from '../../../utils/auth'
import { createPrismaDebtsRepository } from '../../../modules/debts/prisma-debts-repository'
import { getDebt } from '../../../modules/debts/get-debt'
import { updateDebt } from '../../../modules/debts/update-debt'
import { deleteDebt } from '../../../modules/debts/delete-debt'

export default defineEventHandler(async event => {
	const method = event.node.req.method
	const id = getRouterParam(event, 'id')

	if (!id) {
		throw createError({ statusCode: 400, statusMessage: 'Debt ID is required' })
	}

	const repo = createPrismaDebtsRepository(prisma)

	if (method === 'GET') {
		return await getDebt({ debts: repo }, id)
	}

	if (method === 'PUT') {
		requireAdmin(event)
		const body = await readBody(event)
		return await updateDebt({ debts: repo }, id, body)
	}

	if (method === 'DELETE') {
		requireAdmin(event)
		return await deleteDebt({ debts: repo }, id)
	}
})
