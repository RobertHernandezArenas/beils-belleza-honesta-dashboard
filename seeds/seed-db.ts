import 'dotenv/config'
import { prisma } from '../server/utils/prisma'
import bcrypt from 'bcryptjs'

const names = [
	'Juan',
	'Maria',
	'Carlos',
	'Ana',
	'Luis',
	'Elena',
	'Pedro',
	'Sofia',
	'Diego',
	'Laura',
	'Alejandro',
	'Carmen',
	'Javier',
	'Lucia',
	'Miguel',
	'Paula',
	'David',
	'Marta',
	'Jose',
	'Sara',
]
const surnames = [
	'Garcia',
	'Martinez',
	'Lopez',
	'Sanchez',
	'Perez',
	'Gomez',
	'Martin',
	'Jimenez',
	'Ruiz',
	'Hernandez',
	'Diaz',
	'Moreno',
	'Alvarez',
	'Munoz',
	'Romero',
	'Alonso',
	'Gutierrez',
	'Navarro',
	'Torres',
	'Dominguez',
]
const cities = [
	'Madrid',
	'Barcelona',
	'Valencia',
	'Sevilla',
	'Zaragoza',
	'Malaga',
	'Murcia',
	'Palma',
	'Las Palmas',
	'Bilbao',
]
const roles = ['ADMIN', 'USER'] as const
const statuses = ['ON', 'OFF'] as const
const documentTypes = ['DNI', 'PASSPORT', 'NIE'] as const
const genders = ['Male', 'Female', 'Other']
const brandNames = [
  "Masglo",
  "Bioline Jato"
]
const bookingStatuses = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show']

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
		await prisma.brand.deleteMany()
		await prisma.user.deleteMany()

		console.log('🌱 Seeding Brands...')
		const brandsData = brandNames.map(name => ({
			name,
			description: `Marca profesional premium: ${name}. Especialistas en cosmética y cuidado.`,
		}))
		await prisma.brand.createMany({ data: brandsData })

		console.log('👤 Seeding Users (Clients and Staff)...')
		const defaultPassword = 'password123'
		const hashedPassword = await bcrypt.hash(defaultPassword, 10)

		const usersData = Array.from({ length: 25 }).map((_, i) => {
			const name = getRandomItem(names)
			const surname = getRandomItem(surnames)
			// Force first user to be ADMIN, next 2 staff, rest USER
			const role: 'ADMIN' | 'USER' = i === 0 ? 'ADMIN' : i < 3 ? 'ADMIN' : 'USER'
			const status = getRandomItem(statuses)
			const docType = getRandomItem(documentTypes)
			const gender = getRandomItem(genders)
			const city = getRandomItem(cities)
			const birthYear = 1970 + Math.floor(Math.random() * 35)

			return {
				email: i === 0 ? 'admin@beils.com' : `user${i}@example.com`,
				password: hashedPassword,
				name,
				surname,
				phone: `+34${getRandomNumber(600000000, 699999999)}`,
				address: `Calle Falsa ${getRandomNumber(1, 100)}`,
				city,
				country: 'Spain',
				postal_code: getRandomNumber(10000, 52000),
				gender,
				birth_date: new Date(
					birthYear,
					Math.floor(Math.random() * 12),
					Math.floor(Math.random() * 28) + 1,
				),
				role,
				status: i === 0 ? 'ON' : status, // Admin always ON
				avatar: `https://ui-avatars.com/api/?name=${name}+${surname}&background=random`,
				document_type: docType,
				document_number: `${getRandomNumber(10000000, 99999999)}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`,
			}
		})

		await prisma.user.createMany({ data: usersData })

		const allUsers = await prisma.user.findMany()
		const clients = allUsers.filter(u => u.role === 'USER')
		const staffArray = allUsers.filter(u => u.role === 'ADMIN') // Using admin as staff for now

		console.log('📝 Seeding Consents, Questionnaires & Bookings for Clients...')

		const consentsToCreate = []
		const questionnairesToCreate = []
		const bookingsToCreate = []

		for (const client of clients) {
			// GENERATE CONSENTS
			const numConsents = Math.floor(Math.random() * 4) // 0 to 3
			for (let i = 0; i < numConsents; i++) {
				consentsToCreate.push({
					user_id: client.user_id,
					document_url: `https://storage.example.com/consents/${client.user_id}_doc_${i}.pdf`,
					status: 'active',
					notes: 'Consentimiento para tratamientos estéticos firmado digitalmente.',
					signed_date: new Date(Date.now() - Math.random() * 10000000000), // Random past date
				})
			}

			// GENERATE QUESTIONNAIRES
			const numQuestionnaires = Math.floor(Math.random() * 3) // 0 to 2
			for (let i = 0; i < numQuestionnaires; i++) {
				questionnairesToCreate.push({
					user_id: client.user_id,
					title: `Ficha de Diagnóstico ${i + 1}`,
					data: {
						allergies: Math.random() > 0.5 ? ['Ninguna'] : ['Látex', 'Níquel'],
						skin_type: getRandomItem(['Seca', 'Grasa', 'Mixta', 'Sensible']),
						concerns: 'Hidratación y luminosidad',
						last_visit: 'Hace 3 meses',
					},
					created_at: new Date(Date.now() - Math.random() * 5000000000),
				})
			}

			// GENERATE BOOKINGS
			const numBookings = Math.floor(Math.random() * 6) // 0 to 5
			for (let i = 0; i < numBookings; i++) {
				const isPast = Math.random() > 0.4
				const daysOffset = Math.floor(Math.random() * 30) * (isPast ? -1 : 1)
				const bookingDate = new Date()
				bookingDate.setDate(bookingDate.getDate() + daysOffset)

				const startHour = Math.floor(Math.random() * 9) + 9 // 9 to 17
				const isHalfHour = Math.random() > 0.5

				const randStaff = Math.random() > 0.3 ? getRandomItem(staffArray) : null

				bookingsToCreate.push({
					client_id: client.user_id,
					staff_id: randStaff ? randStaff.user_id : null,
					item_type: Math.random() > 0.5 ? 'service' : 'pack',
					item_id: `dummy-item-${Math.floor(Math.random() * 100)}`, // Dummy IDs until Services module is built
					status: isPast
						? getRandomItem(['completed', 'cancelled', 'no_show'])
						: getRandomItem(['pending', 'confirmed']),
					booking_date: bookingDate,
					start_time: `${startHour.toString().padStart(2, '0')}:${isHalfHour ? '30' : '00'}`,
					end_time: `${(startHour + 1).toString().padStart(2, '0')}:${isHalfHour ? '30' : '00'}`,
					duration: 60,
					notes: isPast ? 'El cliente quedó muy satisfecho.' : 'Recordatorio enviado.',
				})
			}
		}

		await prisma.consent.createMany({ data: consentsToCreate })
		await prisma.questionnaire.createMany({ data: questionnairesToCreate })
		await prisma.booking.createMany({ data: bookingsToCreate })

		console.log('✅ Database seeded successfully!')
		console.log(`🔑 Admin account: admin@beils.com / ${defaultPassword}`)
		console.log(`🔑 Total Users seeded: ${usersData.length}`)
		console.log(`📈 Generated ${brandNames.length} Brands`)
		console.log(`📈 Generated ${consentsToCreate.length} Consents`)
		console.log(`📈 Generated ${questionnairesToCreate.length} Questionnaires`)
		console.log(`📈 Generated ${bookingsToCreate.length} Bookings`)
	} catch (error: any) {
		console.error('❌ Error seeding database:', error.message || error)
	} finally {
		await prisma.$disconnect()
	}
}

seedDB()
