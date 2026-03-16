import 'dotenv/config'
import { prisma } from '../server/utils/prisma'

async function checkAdmin() {
	try {
		console.log('🔍 Checking for Admin user...')
		const admin = await prisma.user.findFirst({
			where: { 
				OR: [
					{ email: 'admin@beilsbellezahonesta.com' },
					{ role: 'ADMIN' }
				]
			}
		})

		if (admin) {
			console.log('✅ Admin found:')
			console.log(`   Email: ${admin.email}`)
			console.log(`   Role: ${admin.role}`)
			console.log(`   Status: ${admin.status}`)
			console.log(`   ID: ${admin.user_id}`)
		} else {
			console.log('❌ Admin NOT found in the database.')
			const count = await prisma.user.count()
			console.log(`📊 Total users in DB: ${count}`)
		}
	} catch (error) {
		console.error('❌ Error checking database:', error)
	} finally {
		await prisma.$disconnect()
	}
}

checkAdmin()
