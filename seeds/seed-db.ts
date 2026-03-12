import 'dotenv/config'
import { prisma } from '../server/utils/prisma'
import bcrypt from 'bcryptjs'

const namesMale = [
	'Juan', 'Carlos', 'Luis', 'Pedro', 'Diego', 'Alejandro', 'Javier', 'Miguel', 'David', 'Jose',
	'Antonio', 'Francisco', 'Manuel', 'Ricardo', 'Fernando', 'Roberto', 'Jorge', 'Raúl', 'Álvaro', 'Enrique'
]
const namesFemale = [
	'Maria', 'Ana', 'Elena', 'Sofia', 'Laura', 'Carmen', 'Lucia', 'Paula', 'Marta', 'Sara',
	'Isabel', 'Cristina', 'Beatriz', 'Raquel', 'Verónica', 'Patricia', 'Adriana', 'Daniela', 'Irene', 'Julia'
]
const surnames = [
	'Garcia', 'Martinez', 'Lopez', 'Sanchez', 'Perez', 'Gomez', 'Martin', 'Jimenez', 'Ruiz', 'Hernandez',
	'Diaz', 'Moreno', 'Alvarez', 'Munoz', 'Romero', 'Alonso', 'Gutierrez', 'Navarro', 'Torres', 'Dominguez'
]
const cities = [
	'Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Zaragoza', 'Malaga', 'Murcia',
	'A Coruña', 'Oviedo', 'Santiago de Compostela', 'Pontevedra', 'Vigo', 'León', 'Lugo', 'Ourense', 'Bilbao'
]
const documentTypes = ['DNI', 'PASSPORT', 'NIE'] as const
const statuses = ['ON', 'OFF'] as const

function getRandomItem<T>(arr: readonly T[] | T[]): T {
	return arr[Math.floor(Math.random() * arr.length)]
}

function getRandomNumber(min: number, max: number): string {
	return Math.floor(Math.random() * (max - min + 1) + min).toString()
}

async function seedDB() {
	try {
		console.log('🧹 Cleaning up existing data...')

		// Order matters to avoid foreign key constraints errors
		await prisma.booking.deleteMany()
		await prisma.questionnaire.deleteMany()
		await prisma.consent.deleteMany()
		await prisma.revoke.deleteMany()
		await prisma.debt.deleteMany()
		await prisma.cartItem.deleteMany()
		await prisma.cart.deleteMany()
		await prisma.sequence.deleteMany()
		await prisma.user.deleteMany()

		console.log('👤 Seeding Users (1 Admin + 100 Clients)...')
		const defaultPassword = 'password123'
		const hashedPassword = await bcrypt.hash(defaultPassword, 10)

		// Create 101 users: 1 Admin + 100 Clients
		const usersData = Array.from({ length: 101 }).map((_, i) => {
			const isFirst = i === 0
			const role: 'ADMIN' | 'CLIENT' = isFirst ? 'ADMIN' : 'CLIENT'
			
			// Gender distribution for clients: 20-25% Male, 75-80% Female
			// For index 1-22 (22 users) -> Male (~22%)
			// For index 23-100 (78 users) -> Female (~78%)
			const gender = isFirst ? 'Male' : (i <= 22 ? 'Male' : 'Female')
			const name = isFirst ? 'Admin' : (gender === 'Male' ? getRandomItem(namesMale) : getRandomItem(namesFemale))
			const surname = isFirst ? 'Beils' : getRandomItem(surnames)
			const status = isFirst ? 'ON' : getRandomItem(statuses)
			const docType = getRandomItem(documentTypes)
			const city = getRandomItem(cities)
			const birthYear = 1975 + Math.floor(Math.random() * 30)

			return {
				email: isFirst ? 'admin@beilsbellezahonesta.com' : `cliente${i}@example.com`,
				password: hashedPassword,
				name,
				surname,
				phone: `+34${getRandomNumber(600000000, 699999999)}`,
				address: `Calle Falsa ${getRandomNumber(1, 100)}`,
				city,
				country: 'Spain',
				postal_code: getRandomNumber(10000, 52000),
				gender,
				birth_date: new Date(birthYear, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
				role,
				status,
				avatar: `https://ui-avatars.com/api/?name=${name}+${surname}&background=random`,
				document_type: docType,
				document_number: `${getRandomNumber(10000000, 99999999)}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`,
			}
		})

		await prisma.user.createMany({ data: usersData })

		const allUsers = await prisma.user.findMany()
		const clients = allUsers.filter(u => u.role === 'CLIENT')
		const admin = allUsers.find(u => u.role === 'ADMIN')

		console.log('📝 Seeding child records (Consents, Questionnaires & Bookings)...')

		const consentsToCreate = []
		const questionnairesToCreate = []
		const bookingsToCreate = []

		for (const client of clients) {
			// GENERATE CONSENTS
			const numConsents = Math.floor(Math.random() * 3) // 0 to 2
			for (let i = 0; i < numConsents; i++) {
				consentsToCreate.push({
					user_id: client.user_id,
					document_url: `https://storage.example.com/consents/${client.user_id}_doc_${i}.pdf`,
					status: getRandomItem(['SIGNED', 'UNSIGNED']),
					notes: 'Consentimiento para tratamientos estéticos firmado digitalmente.',
					signed_date: new Date(Date.now() - Math.random() * 10000000000),
				})
			}

			// GENERATE QUESTIONNAIRES
			const numQuestionnaires = Math.floor(Math.random() * 2) // 0 to 1
			for (let i = 0; i < numQuestionnaires; i++) {
				questionnairesToCreate.push({
					user_id: client.user_id,
					title: `Ficha de Diagnóstico ${i + 1}`,
					data: {
						allergies: Math.random() > 0.8 ? ['Látex'] : ['Ninguna'],
						skin_type: getRandomItem(['Seca', 'Grasa', 'Mixta', 'Sensible']),
						concerns: 'Tratamiento facial',
					},
					created_at: new Date(Date.now() - Math.random() * 5000000000),
				})
			}

			// GENERATE BOOKINGS
			const numBookings = Math.floor(Math.random() * 4) // 0 to 3
			for (let i = 0; i < numBookings; i++) {
				const isPast = Math.random() > 0.5
				const daysOffset = Math.floor(Math.random() * 30) * (isPast ? -1 : 1)
				const bookingDate = new Date()
				bookingDate.setDate(bookingDate.getDate() + daysOffset)

				const startHour = Math.floor(Math.random() * 8) + 9 

				bookingsToCreate.push({
					client_id: client.user_id,
					staff_id: admin?.user_id || null, // For now admin is staff
					item_type: 'service',
					item_id: `dummy-id-${Math.floor(Math.random() * 50)}`,
					status: isPast ? 'completed' : 'pending',
					booking_date: bookingDate,
					start_time: `${startHour.toString().padStart(2, '0')}:00`,
					end_time: `${(startHour + 1).toString().padStart(2, '0')}:00`,
					duration: 60,
					notes: 'Cita generada automáticamente.',
				})
			}
		}

		if (consentsToCreate.length > 0) await prisma.consent.createMany({ data: consentsToCreate })
		if (questionnairesToCreate.length > 0) await prisma.questionnaire.createMany({ data: questionnairesToCreate })
		if (bookingsToCreate.length > 0) await prisma.booking.createMany({ data: bookingsToCreate })

		console.log('✅ Database seeded successfully!')
		console.log(`🔑 Admin account: admin@beilsbellezahonesta.com / ${defaultPassword}`)
		console.log(`🔑 Total Users seeded: ${usersData.length} (1 Admin + 100 Clients)`)
		console.log(`📈 Male/Female Distribution: ~22% Male / ~78% Female`)
	} catch (error: any) {
		console.error('❌ Error seeding database:', error.message || error)
	} finally {
		await prisma.$disconnect()
	}
}

seedDB()
