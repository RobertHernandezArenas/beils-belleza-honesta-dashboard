import 'dotenv/config'
import { prisma } from '../server/utils/prisma'
import bcrypt from 'bcryptjs'

async function debugLogin() {
	const email = 'admin@beils.com'
	const password = 'password123'

	try {
		console.log(`🔍 Debugging login for ${email}...`)
		const user = await prisma.user.findUnique({
			where: { email }
		})

		if (!user) {
			console.log('❌ User not found in database.')
			return
		}

		console.log('✅ User found:')
		console.log(`   ID: ${user.user_id}`)
		console.log(`   Role: ${user.role}`)
		console.log(`   Status: ${user.status}`)
		
		const isPasswordMatch = await bcrypt.compare(password, user.password)
		console.log(`🔑 Password match: ${isPasswordMatch ? 'YES' : 'NO'}`)

		if (!isPasswordMatch) {
			console.log('⚠️  Password hash in DB does not match "password123".')
		}

		if (user.status !== 'ON') {
			console.log(`⚠️  User status is ${user.status}, not 'ON'.`)
		}

	} catch (error) {
		console.error('❌ Error during debug:', error)
	} finally {
		await prisma.$disconnect()
	}
}

debugLogin()
