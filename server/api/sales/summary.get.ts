import { getSalesSummary } from '../../modules/sales/get-sales-summary'
import { createPrismaSalesRepository } from '../../modules/sales/prisma-sales-repository'

export default defineEventHandler(async event => {
	return await getSalesSummary({ sales: createPrismaSalesRepository(prisma) }, getQuery(event))
})
