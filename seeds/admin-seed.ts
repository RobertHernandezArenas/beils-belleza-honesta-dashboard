import 'dotenv/config'
import { prisma } from '../server/utils/prisma'
import bcrypt from 'bcryptjs'
import { resolveSeedPassword } from './seed-safety'

async function seedAdmin() {
	try {
		console.log('👤 Checking for Admin user...')
		const adminEmail = 'admin@beilsbellezahonesta.com'
		
		const existingAdmin = await prisma.user.findUnique({
			where: { email: adminEmail }
		})

		if (existingAdmin) {
			console.log('✅ Admin user already exists.')
			return
		}

		console.log('🚀 Creating Admin user...')
		// From SEED_ADMIN_PASSWORD or random (printed once); never a shared default
		const { password: adminPassword, generated } = resolveSeedPassword(process.env)
		const hashedPassword = await bcrypt.hash(adminPassword, 12)
		if (generated) console.log(`🔑 Contraseña generada para ${adminEmail}: ${adminPassword} (guárdala ahora; no se vuelve a mostrar)`)

		await prisma.user.create({
			data: {
				email: adminEmail,
				password: hashedPassword,
				name: 'Robert',
				surname: 'Admin',
				phone: '+34600000000',
				address: 'Calle de la Belleza 10',
				city: 'Madrid',
				country: 'Spain',
				postal_code: '28001',
				gender: 'Male',
				birth_date: new Date(1985, 0, 1),
				role: 'ADMIN',
				status: 'ON',
				avatar: 'https://ui-avatars.com/api/?name=Robert+Admin&background=020617&color=fff',
				document_type: 'DNI',
				document_number: '12345678A',
				annotations: 'Administrador principal del sistema Beils. Acceso total.',
			}
		})

		console.log('✅ Admin user created successfully!')
		console.log('📧 Email: ' + adminEmail)
		if (!generated) console.log('🔑 Password: la definida en SEED_ADMIN_PASSWORD')
	} catch (error: any) {
		console.error('❌ Error seeding Admin:', error.stack || error.message || error)
	} finally {
		await prisma.$disconnect()
	}
}

seedAdmin()
