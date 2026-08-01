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

const targetClients = [
	{
		user_id: '18b4b6bd-c768-417c-8289-961d9b9cb8a6',
		name: 'Lucia Carneiro',
		packageName: 'Bono Indiba 11',
		totalSessions: 11,
		price: 450
	},
	{
		user_id: '20c8c750-33be-4d8e-84e4-092cf5c6482a',
		name: 'Antonella Delli Gatti',
		packageName: 'Bono Corporal Indiba 15 sesiones',
		totalSessions: 15,
		price: 600
	},
	{
		user_id: '34958d5c-6685-4287-9e1c-f3b42a4fdee4',
		name: 'INCA HOSPITAL',
		packageName: 'Bono INDIBA Facial 6+ 1 Sesiones',
		totalSessions: 7,
		price: 350
	},
	{
		user_id: '4e694f11-a2a7-4053-8aa2-13ea5bd6eb3a',
		name: 'Laura Laur',
		packageName: 'Bono Corporal Indiba 15 sesiones',
		totalSessions: 15,
		price: 600
	},
	{
		user_id: '87f8b95a-1763-47e6-8acd-824bdae7b5ef',
		name: 'Kathryn Mccrary',
		packageName: 'Bono Indiba 11',
		totalSessions: 11,
		price: 450
	}
]

async function main() {
	try {
		console.log('🧹 Cleaning up all assigned client packages...')
		
		// 1. Delete all existing client package items and client packages
		await prisma.clientPackageItem.deleteMany({})
		await prisma.clientPackage.deleteMany({})

		console.log('✅ Client packages cleared!')

		// 2. Ensure catalog packages exist for these 3 package types
		const catalogPackagesMap: Record<string, any> = {}

		for (const target of targetClients) {
			if (!catalogPackagesMap[target.packageName]) {
				let existingPkg = await prisma.package.findFirst({
					where: { name: target.packageName }
				})

				if (!existingPkg) {
					existingPkg = await prisma.package.create({
						data: {
							name: target.packageName,
							description: `Paquete especial de Indiba (${target.totalSessions} sesiones).`,
							type: 'INDIVIDUAL',
							price: target.price,
							total_sessions: target.totalSessions,
							status: 'activo'
						}
					})

					await prisma.packageItem.create({
						data: {
							package_id: existingPkg.package_id,
							item_type: 'SERVICE',
							item_id: 'indiba-service-item',
							name: target.packageName,
							quantity: target.totalSessions,
							duration: 45
						}
					})
				}
				catalogPackagesMap[target.packageName] = existingPkg
			}
		}

		// 3. Assign packages ONLY to the exact 5 clients
		console.log('📦 Assigning packages ONLY to the 5 target clients...')

		for (const target of targetClients) {
			const catalogPkg = catalogPackagesMap[target.packageName]
			
			// Verify client exists
			const user = await prisma.user.findUnique({
				where: { user_id: target.user_id }
			})

			if (!user) {
				console.warn(`User ${target.user_id} (${target.name}) not found in DB!`)
				continue
			}

			const expiryDate = new Date()
			expiryDate.setMonth(expiryDate.getMonth() + 12)

			const cp = await prisma.clientPackage.create({
				data: {
					user_id: target.user_id,
					package_id: catalogPkg.package_id,
					total_sessions: target.totalSessions,
					remaining_sessions: target.totalSessions,
					expiry_date: expiryDate,
					status: 'ACTIVE'
				}
			})

			// Add package item
			const pkgItem = await prisma.packageItem.findFirst({
				where: { package_id: catalogPkg.package_id }
			})

			if (pkgItem) {
				await prisma.clientPackageItem.create({
					data: {
						client_package_id: cp.client_package_id,
						package_item_id: pkgItem.package_item_id,
						name: target.packageName,
						item_type: 'SERVICE',
						quantity_total: target.totalSessions,
						quantity_remaining: target.totalSessions,
						duration: 45
					}
				})
			}

			console.log(`✅ Assigned ${target.packageName} (${target.totalSessions} sessions) to ${target.name}`)
		}

		console.log('🎉 Done! Only the 5 target clients have active packages assigned.')
	} catch (e) {
		console.error('❌ Error during sync:', e)
	} finally {
		await prisma.$disconnect()
	}
}

main()
