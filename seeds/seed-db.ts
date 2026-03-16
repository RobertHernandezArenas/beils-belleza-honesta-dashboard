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
		await prisma.clientBonus.deleteMany()
		await prisma.bonus.deleteMany()
		await prisma.giftcard.deleteMany()
		await prisma.coupon.deleteMany()
		await prisma.packItemProduct.deleteMany()
		await prisma.packItemService.deleteMany()
		await prisma.pack.deleteMany()
		await prisma.productTag.deleteMany()
		await prisma.tag.deleteMany()
		await prisma.product.deleteMany()
		await prisma.subcategory.deleteMany()
		await prisma.category.deleteMany()
		await prisma.service.deleteMany()
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

		console.log('📝 Seeding child records (Consents, Questionnaires, Revokes & Bookings)...')

		const consentsToCreate = []
		const questionnairesToCreate = []
		const revokesToCreate = []
		const bookingsToCreate = []

		for (const client of clients) {
			// GENERATE CONSENTS
			// Most clients have 1-2 consents
			const numConsents = Math.floor(Math.random() * 3) + 1 
			for (let i = 0; i < numConsents; i++) {
				consentsToCreate.push({
					user_id: client.user_id,
					document_url: `https://storage.example.com/consents/${client.user_id}_doc_${i}.pdf`,
					status: getRandomItem(['SIGNED', 'SIGNED', 'UNSIGNED']), // More signed than unsigned
					notes: getRandomItem([
						'Consentimiento para tratamientos estéticos firmado digitalmente.',
						'Aceptación de política de privacidad y protección de datos.',
						'Consentimiento informado para depilación láser.',
						'Autorización para uso de imágenes con fines promocionales.',
						''
					]),
					signed_date: new Date(Date.now() - Math.random() * 10000000000),
				})
			}

			// GENERATE QUESTIONNAIRES
			const numQuestionnaires = Math.floor(Math.random() * 2) // 0 to 1
			for (let i = 0; i < numQuestionnaires; i++) {
				questionnairesToCreate.push({
					user_id: client.user_id,
					title: getRandomItem([
						'Ficha de Diagnóstico Facial',
						'Cuestionario de Salud Inicial',
						'Evaluación de Alergias',
						'Historial de Tratamientos'
					]),
					data: {
						allergies: Math.random() > 0.8 ? ['Látex', 'Níquel'] : ['Ninguna'],
						skin_type: getRandomItem(['Seca', 'Grasa', 'Mixta', 'Sensible', 'Normal']),
						concerns: getRandomItem(['Arrugas', 'Manchas', 'Acné', 'Flacidez', 'Deshidratación']),
						medications: Math.random() > 0.9 ? 'Ibuprofeno' : 'Ninguno'
					},
					created_at: new Date(Date.now() - Math.random() * 5000000000),
				})
			}

			// GENERATE REVOCATIONS (Rare event)
			if (Math.random() > 0.9) {
				revokesToCreate.push({
					user_id: client.user_id,
					reason: getRandomItem([
						'El cliente ya no desea recibir comunicaciones comerciales.',
						'Desacuerdo con los nuevos términos de servicio.',
						'Solicitud expresa de borrado de datos (Derecho al olvido).',
						'Cambio de opinión sobre el tratamiento.'
					]),
					date_revoked: new Date(Date.now() - Math.random() * 2000000000),
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
		if (revokesToCreate.length > 0) await prisma.revoke.createMany({ data: revokesToCreate })
		
		console.log('📦 Seeding Catalog (Categories, Products, Services)...')
		
		const category = await prisma.category.create({
			data: {
				name: 'Cuidado Facial',
				description: 'Tratamientos y productos para la piel del rostro.',
				subcategories: {
					create: [
						{ name: 'Limpieza', description: 'Leches, geles y tónicos.' },
						{ name: 'Hidratación', description: 'Cremas y serums hidratantes.' }
					]
				}
			}
		})

		const subcategories = await prisma.subcategory.findMany({ where: { category_id: category.category_id } })

		await prisma.product.create({
			data: {
				name: 'Crema Hidratante Pro-Age',
				description: 'Crema con ácido hialurónico.',
				price: 45.0,
				stock: 20,
				category_id: category.category_id,
				subcategory_id: subcategories[1].subcategory_id,
				image_url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400'
			}
		})

		const facialService = await prisma.service.create({
			data: {
				name: 'Higiene Facial Completa',
				description: 'Limpieza profunda con extracción.',
				price: 60.0,
				duration: 60,
				code: 'HF-01'
			}
		})

		console.log('🎟️ Seeding Coupons & Bonuses...')

		await prisma.coupon.createMany({
			data: [
				{
					code: 'BIENVENIDA10',
					description: '10% de descuento en tu primer servicio.',
					discount_type: 'percentage',
					discount_value: 10,
					status: 'activo',
					valid_until: new Date(2026, 11, 31)
				},
				{
					code: 'FIEL20',
					description: '20€ de descuento por fidelidad.',
					discount_type: 'fixed',
					discount_value: 20,
					min_purchase: 100,
					status: 'activo'
				}
			]
		})

		await prisma.bonus.create({
			data: {
				name: 'Bono 5 Higienes Faciales',
				description: 'Paquete de 5 sesiones de higiene facial con descuento.',
				total_sessions: 5,
				price: 250.0,
				service_id: facialService.service_id,
				status: 'activo'
			}
		})

		if (bookingsToCreate.length > 0) await prisma.booking.createMany({ data: bookingsToCreate })

		console.log('✅ Database seeded successfully!')
		console.log(`🔑 Admin account: admin@beilsbellezahonesta.com / ${defaultPassword}`)
		console.log(`🔑 Total Users seeded: ${usersData.length} (1 Admin + 100 Clients)`)
		console.log(`📊 Consents created: ${consentsToCreate.length}`)
		console.log(`📊 Questionnaires created: ${questionnairesToCreate.length}`)
		console.log(`📊 Revocations created: ${revokesToCreate.length}`)
		console.log(`📈 Male/Female Distribution: ~22% Male / ~78% Female`)
	} catch (error: any) {
		console.error('❌ Error seeding database:', error.message || error)
	} finally {
		await prisma.$disconnect()
	}
}

seedDB()
