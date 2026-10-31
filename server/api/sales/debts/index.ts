import { createPrismaDebtsRepository } from '../../../modules/debts/prisma-debts-repository'
import { listDebts } from '../../../modules/debts/list-debts'
import { createDebt } from '../../../modules/debts/create-debt'

export default defineEventHandler(async event => {
	const method = event.node.req.method
	const repo = createPrismaDebtsRepository(prisma)

	if (method === 'GET') {
		const query = getQuery(event)
		return await listDebts({ debts: repo }, query)
	}

	if (method === 'POST') {
		const body = await readBody(event)
		return await createDebt({ debts: repo }, body)
	}
})
