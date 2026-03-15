import 'dotenv/config'
import { prisma } from '../server/utils/prisma'
import bcrypt from 'bcryptjs'
import { mkdir } from 'fs/promises'
import { join } from 'path'

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
		await prisma.clientBonus.deleteMany()
		await prisma.bonus.deleteMany()
		await prisma.debt.deleteMany()
		await prisma.cartItem.deleteMany()
		await prisma.cart.deleteMany()
		await prisma.giftcard.deleteMany()
		await prisma.coupon.deleteMany()
		await prisma.packItemProduct.deleteMany()
		await prisma.packItemService.deleteMany()
		await prisma.pack.deleteMany()
		await prisma.productTag.deleteMany()
		await prisma.product.deleteMany()
		await prisma.tag.deleteMany()
		await prisma.subcategory.deleteMany()
		await prisma.category.deleteMany()
		await prisma.service.deleteMany()
		await prisma.sequence.deleteMany()
		await prisma.user.deleteMany()

		console.log('📂 Initializing multimedia directory structure...')
		const multimediaPaths = [
			'public/multimedia/imagenes/productos',
			'public/multimedia/imagenes/servicios',
			'public/multimedia/imagenes/usuarios/clientes',
			'public/multimedia/imagenes/usuarios/admin',
			'public/multimedia/videos',
			'public/multimedia/archivos',
		]
		for (const path of multimediaPaths) {
			await mkdir(join(process.cwd(), path), { recursive: true })
		}

		console.log('👤 Seeding Users (1 Admin + 100 Clients)...')
		const defaultPassword = 'password123'
		const hashedPassword = await bcrypt.hash(defaultPassword, 10)

		const usersData = Array.from({ length: 101 }).map((_, i) => {
			const isFirst = i === 0
			const role: 'ADMIN' | 'CLIENT' = isFirst ? 'ADMIN' : 'CLIENT'
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

		console.log('🏷️ Seeding Catalog (Categories, Subcategories, Tags)...')
		const categories = [
			{ name: 'Facial', description: 'Tratamientos para el rostro' },
			{ name: 'Corporal', description: 'Cuidado del cuerpo' },
			{ name: 'Cabello', description: 'Estética capilar' }
		]

		for (const cat of categories) {
			const category = await prisma.category.create({
				data: {
					name: cat.name,
					description: cat.description,
					subcategories: {
							create: [
								{ name: `${cat.name} Premium`, description: `Subcategoría premium de ${cat.name}` },
								{ name: `${cat.name} Básico`, description: `Subcategoría básica de ${cat.name}` }
							]
					}
				}
			})
		}

		const allSubcategories = await prisma.subcategory.findMany()
		const tags = await prisma.tag.createMany({
			data: [
				{ name: 'Novedad', color: 'blue' },
				{ name: 'Oferta', color: 'red' },
				{ name: 'VIP', color: 'purple' },
				{ name: 'Natural', color: 'green' }
			]
		})
		const allTags = await prisma.tag.findMany()

		console.log('📦 Seeding Products...')
		const productNames = ['Sérum Vitamina C', 'Crema Hidratante Pro', 'Exfoliante Zen', 'Champú Bio', 'Mascarilla Clay']
		for (let i = 0; i < 15; i++) {
			const sub = getRandomItem(allSubcategories)
			const product = await prisma.product.create({
				data: {
					name: getRandomItem(productNames) + ' ' + (i + 1),
					description: 'Producto de alta calidad para cuidados específicos.',
					price: Math.floor(Math.random() * 80) + 10,
					stock: Math.floor(Math.random() * 50) + 5,
					min_stock: 5,
					category_id: sub.category_id,
					subcategory_id: sub.subcategory_id,
					status: 'activo',
					tags: {
						create: [
							{ tag_id: getRandomItem(allTags).tag_id }
						]
					}
				}
			})
		}

		console.log('💇 Seeding Services & Packs...')
		const services = [
			{ name: 'Limpieza Facial Profunda', price: 45, duration: 60 },
			{ name: 'Masaje Relajante', price: 35, duration: 45 },
			{ name: 'Tratamiento Indiba Corporal', price: 65, duration: 50 },
			{ name: 'Peeling Químico', price: 80, duration: 40 }
		]
		for (const s of services) {
			await prisma.service.create({ data: s })
		}
		const allServices = await prisma.service.findMany()

		await prisma.pack.create({
			data: {
				name: 'Pack Super Facial',
				description: 'Combina limpieza con sérum profesional.',
				price: 110,
				services: {
					create: [{ service_id: allServices[0].service_id, quantity: 1 }]
				}
			}
		})

		console.log('🎟️ Seeding Marketing (Coupons, Giftcards, Bonuses)...')
		await prisma.coupon.createMany({
			data: [
				{ code: 'BIENVENIDA20', discount_type: 'percentage', discount_value: 20, description: 'Cupón de bienvenida' },
				{ code: 'FIEL10', discount_type: 'fixed', discount_value: 10, description: 'Descuento cliente fiel' }
			]
		})

		for (let i = 0; i < 5; i++) {
			await prisma.giftcard.create({
				data: {
					code: `GIFT-${getRandomNumber(1000, 9999)}`,
					initial_balance: 50,
					current_balance: 50,
					client_id: getRandomItem(clients).user_id
				}
			})
		}

		for (let i = 0; i < 10; i++) {
			const bonus = await prisma.bonus.create({
				data: {
					name: 'Bono 5 sesiones Indiba',
					total_sessions: 5,
					price: 250,
					service_id: allServices[2].service_id
				}
			})
			await prisma.clientBonus.create({
				data: {
					client_id: getRandomItem(clients).user_id,
					bonus_id: bonus.bonus_id,
					remaining_sessions: 5,
					status: 'activo'
				}
			})
		}

		console.log('📝 Seeding CRM records (Consents, Questionnaires & Bookings)...')
		const consentsToCreate = []
		const questionnairesToCreate = []
		const bookingsToCreate = []

		for (const client of clients) {
			const numConsents = Math.floor(Math.random() * 3)
			for (let i = 0; i < numConsents; i++) {
				consentsToCreate.push({
					user_id: client.user_id,
					consent_type: getRandomItem(['LGPD', 'INDIBA', 'LASER_INNOVA_PRO_SHR']) as any,
					accepted: true,
					accepted_at: new Date(),
					document_url: `/multimedia/archivos/${client.user_id}_consent.pdf`,
					notes: 'Firmado digitalmente'
				})
			}

			const numQuestionnaires = Math.floor(Math.random() * 2)
			for (let i = 0; i < numQuestionnaires; i++) {
				questionnairesToCreate.push({
					user_id: client.user_id,
					title: `Ficha de Diagnóstico ${i + 1}`,
					data: {
						skin_type: getRandomItem(['Seca', 'Grasa', 'Mixta']),
						allergies: ['Ninguna']
					}
				})
			}

			const numBookings = Math.floor(Math.random() * 4)
			for (let i = 0; i < numBookings; i++) {
				const isPast = Math.random() > 0.5
				const bookingDate = new Date()
				bookingDate.setDate(bookingDate.getDate() + (isPast ? -15 : 15))
				const startHour = 9 + Math.floor(Math.random() * 8)

				bookingsToCreate.push({
					client_id: client.user_id,
					staff_id: admin?.user_id,
					item_type: 'service',
					item_id: getRandomItem(allServices).service_id,
					status: isPast ? 'completed' : 'pending',
					booking_date: bookingDate,
					start_time: `${startHour.toString().padStart(2, '0')}:00`,
					end_time: `${(startHour + 1).toString().padStart(2, '0')}:00`,
					duration: 60
				})
			}
		}

		// Use create to handle unique constraints/relations better where createMany might fail or skip logic
		console.log('🔗 Attaching Consents...')
		for (const c of consentsToCreate) {
			try { await prisma.consent.create({ data: c }) } catch (e) {} // Skip duplicates
		}
		
		console.log('📋 Creating Questionnaires...')
		if (questionnairesToCreate.length > 0) await prisma.questionnaire.createMany({ data: questionnairesToCreate })
		
		console.log('📅 Creating Bookings...')
		if (bookingsToCreate.length > 0) await prisma.booking.createMany({ data: bookingsToCreate })

		console.log('🔍 Final Verification...')
		const verifiedAdmin = await prisma.user.findUnique({
			where: { email: 'admin@beilsbellezahonesta.com' }
		})

		if (verifiedAdmin) {
			console.log(`✅ Admin verified: ${verifiedAdmin.email} (ID: ${verifiedAdmin.user_id})`)
		} else {
			console.error('❌ CRITICAL: Admin user NOT found after seeding!')
		}

		console.log('✅ Database seeded successfully!')
		console.log(`🔑 Admin: admin@beilsbellezahonesta.com / password123`)
	} catch (error: any) {
		console.error('❌ Error seeding database:', error.stack || error.message || error)
	} finally {
		await prisma.$disconnect()
	}
}

seedDB()
