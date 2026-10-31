import { createPrismaReportsRepository } from '../../modules/reports/prisma-reports-repository'
import { getReports } from '../../modules/reports/get-reports'

export default defineEventHandler(async event => {
	const query = getQuery(event)
	const range = query.range as string | undefined
	const repo = createPrismaReportsRepository(prisma)

	return await getReports({ reports: repo }, range)
})
