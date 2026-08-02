import 'dotenv/config'
import pkg from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'

const { PrismaClient } = pkg

const poolConfig = {
	host: process.env.DATABASE_HOST || '46.202.140.68',
	user: process.env.DATABASE_USER,
	password: process.env.DATABASE_PASSWORD,
	database: process.env.DATABASE_NAME,
	port: parseInt(process.env.DATABASE_PORT || '3306', 10),
	connectionLimit: 10,
	allowPublicKeyRetrieval: true,
}

const prisma = new PrismaClient({
	adapter: new PrismaMariaDb(poolConfig)
})

async function main() {
	try {
		console.log('Testing Prisma user query...')
		const count = await prisma.user.count()
		console.log('Total users:', count)
		
		const packagesCount = await prisma.package.count()
		console.log('Total catalog packages:', packagesCount)

		const clientPackagesCount = await prisma.clientPackage.count()
		console.log('Total client packages:', clientPackagesCount)
	} catch (err) {
		console.error('Prisma test error:', err)
	} finally {
		await prisma.$disconnect()
	}
}

main()
