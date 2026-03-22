import 'dotenv/config'
import { prisma } from '../server/utils/prisma'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { mkdir } from 'fs/promises'
import { join } from 'path'

// --- Extended Data Lists ---
const namesMale = [
	'Juan', 'Carlos', 'Luis', 'Pedro', 'Diego', 'Alejandro', 'Javier', 'Miguel', 'David', 'Jose',
	'Antonio', 'Francisco', 'Manuel', 'Ricardo', 'Fernando', 'Roberto', 'Jorge', 'Raúl', 'Álvaro', 'Enrique',
	'Marcos', 'Pau', 'Gabriel', 'Adrian', 'Victor', 'Iker', 'Marc', 'Oscar', 'Nicolas', 'Ruben'
]
const namesFemale = [
	'Maria', 'Ana', 'Elena', 'Sofia', 'Laura', 'Carmen', 'Lucia', 'Paula', 'Marta', 'Sara',
	'Isabel', 'Cristina', 'Beatriz', 'Raquel', 'Verónica', 'Patricia', 'Adriana', 'Daniela', 'Irene', 'Julia',
	'Noelia', 'Miriam', 'Ines', 'Alba', 'Clara', 'Sonia', 'Monica', 'Vanesa', 'Lorena', 'Nerea'
]
const surnames = [
	'Garcia', 'Martinez', 'Lopez', 'Sanchez', 'Perez', 'Gomez', 'Martin', 'Jimenez', 'Ruiz', 'Hernandez',
	'Diaz', 'Moreno', 'Alvarez', 'Munoz', 'Romero', 'Alonso', 'Gutierrez', 'Navarro', 'Torres', 'Dominguez',
	'Vázquez', 'Ramos', 'Gil', 'Ramírez', 'Serrano', 'Blanco', 'Molina', 'Morales', 'Suarez', 'Ortega'
]
const cities = [
	'Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Zaragoza', 'Malaga', 'Murcia', 'Palma', 'Las Palmas', 'Bilbao',
	'Alicante', 'Córdoba', 'Valladolid', 'Vigo', 'Gijón', 'Hospitalet', 'Granada', 'Vitoria', 'Elche', 'Tarragona',
	'A Coruña', 'Oviedo', 'Santiago de Compostela', 'Pontevedra', 'León', 'Lugo', 'Ourense'
]
const productBaseNames = [
	'Sérum Vitamina C', 'Crema Hidratante Pro', 'Exfoliante Zen', 'Champú Bio', 'Mascarilla Clay',
	'Aceite de Argán', 'Tónico Equilibrante', 'Contorno de Ojos', 'Protector Solar FPS50', 'Bálsamo Labial Nutritivo'
]
const serviceBaseNames = [
	{ name: 'Limpieza Facial Profunda', price: 45, duration: 60, desc: 'Limpieza profunda con extracción e hidratación de alta gama.' },
	{ name: 'Masaje Relajante Beils', price: 35, duration: 45, desc: 'Masaje sueco diseñado para el alivio total del estrés y tensiones.' },
	{ name: 'Tratamiento Indiba Corporal', price: 65, duration: 50, desc: 'Radiofrecuencia avanzada para regeneración celular, firmeza y remodelación.' },
	{ name: 'Peeling Químico Renovador', price: 80, duration: 40, desc: 'Tratamiento renovador profundo con ácidos frutales y antioxidantes.' },
	{ name: 'Manicura Permanente Premium', price: 25, duration: 45, desc: 'Esmaltado de larga duración con refuerzo de keratina y calcio.' },
	{ name: 'Depilación Láser Diodo', price: 50, duration: 30, desc: 'Depilación definitiva con tecnología de última generación, segura y eficaz.' }
]

// --- Validation Schemas ---
const UserSchema = z.object({
	email: z.string().email(),
	password: z.string(),
	name: z.string(),
	surname: z.string(),
	phone: z.string(),
	address: z.string(),
	city: z.string(),
	country: z.string().default('Spain'),
	postal_code: z.string(),
	gender: z.enum(['Male', 'Female', 'Other']),
	birth_date: z.date(),
	role: z.enum(['ADMIN', 'CLIENT', 'STAFF']),
	status: z.enum(['ON', 'OFF']),
	avatar: z.string().url(),
	document_type: z.enum(['DNI', 'PASSPORT', 'NIE']),
	document_number: z.string(),
	annotations: z.string().optional().default(''),
})

// --- Helper Functions ---
function getRandomItem<T>(arr: readonly T[] | T[]): T {
	return arr[Math.floor(Math.random() * arr.length)]
}

function getRandomNumber(min: number, max: number): string {
	return Math.floor(Math.random() * (max - min + 1) + min).toString()
}

async function seedDB() {
	try {
		console.log('🧹 Cleaning up existing data...')
		const tables = [
			'booking', 'questionnaire', 'consent', 'revoke', 'clientBonus', 'bonus', 'debt',
			'cartItem', 'cart', 'giftcard', 'coupon', 'packItemProduct', 'packItemService',
			'pack', 'productTag', 'product', 'tag', 'subcategory', 'category', 'service',
			'sequence', 'user'
		]
		
		for (const table of tables) {
			const model = (prisma as any)[table]
			if (model) await model.deleteMany()
		}

		console.log('📂 Initializing multimedia directory structure...')
		const multimediaPaths = [
			'public/multimedia/imagenes/productos',
			'public/multimedia/imagenes/servicios',
			'public/multimedia/imagenes/clientes',
			'public/multimedia/imagenes/usuarios/admin',
			'public/multimedia/videos',
			'public/multimedia/archivos',
		]
		for (const path of multimediaPaths) {
			await mkdir(join(process.cwd(), path), { recursive: true })
		}

		console.log('👤 Seeding Users...')
		const defaultPassword = 'password123'
		const hashedPassword = await bcrypt.hash(defaultPassword, 10)

		const usersData = []
		
		// 1. Admin
		usersData.push(UserSchema.parse({
			email: 'admin@beilsbellezahonesta.com',
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
		}))

		// 2. Staff
		const staffNames = ['Alicia', 'Beatriz', 'Carolina']
		for (const name of staffNames) {
			const surname = getRandomItem(surnames)
			usersData.push(UserSchema.parse({
				email: `${name.toLowerCase()}@beils.com`,
				password: hashedPassword,
				name,
				surname,
				phone: `+34${getRandomNumber(600000000, 699999999)}`,
				address: `Avenida del Sol ${getRandomNumber(1, 100)}`,
				city: getRandomItem(cities),
				postal_code: getRandomNumber(28000, 28999),
				gender: 'Female',
				birth_date: new Date(1990 + Math.floor(Math.random() * 10), 5, 20),
				role: 'STAFF',
				status: 'ON',
				avatar: `https://ui-avatars.com/api/?name=${name}+${surname}&background=6366f1&color=fff`,
				document_type: 'DNI',
				document_number: `${getRandomNumber(10000000, 99999999)}P`,
				annotations: `Especialista en tratamientos Beils. Miembro del equipo de ${getRandomItem(cities)}.`,
			}))
		}

		// 3. Clients
		for (let i = 1; i <= 60; i++) {
			const gender = Math.random() > 0.8 ? 'Male' : 'Female'
			const name = gender === 'Male' ? getRandomItem(namesMale) : getRandomItem(namesFemale)
			const surname = getRandomItem(surnames)
			usersData.push(UserSchema.parse({
				email: `cliente${i}@example.com`,
				password: hashedPassword,
				name,
				surname,
				phone: `+34${getRandomNumber(600000000, 699999999)}`,
				address: `Calle Cliente ${i}, ${getRandomNumber(1, 100)}`,
				city: getRandomItem(cities),
				postal_code: getRandomNumber(10000, 52000),
				gender,
				birth_date: new Date(1975 + Math.floor(Math.random() * 35), Math.floor(Math.random() * 12), i % 28 + 1),
				role: 'CLIENT',
				status: getRandomItem(['ON', 'ON', 'ON', 'OFF']),
				avatar: `https://ui-avatars.com/api/?name=${name}+${surname}&background=f1f5f9&color=0f172a`,
				document_type: getRandomItem(['DNI', 'PASSPORT', 'NIE']),
				document_number: `${getRandomNumber(10000000, 99999999)}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`,
				annotations: Math.random() > 0.5 ? 'Cliente habitual con preferencia por tratamientos faciales y productos orgánicos.' : 'Nuevo cliente interesado en promociones de bienvenida.',
			}))
		}

		await prisma.user.createMany({ data: usersData })
		const allUsers = await prisma.user.findMany()
		const staffMembers = allUsers.filter(u => u.role === 'STAFF' || u.role === 'ADMIN')

		console.log('🏷️ Seeding Catalog...')
		const categoriesData = [
			{ name: 'Facial', desc: 'Tratamientos específicos para el rejuvenecimiento y cuidado del rostro.' },
			{ name: 'Corporal', desc: 'Programas de remodelación, hidratación y bienestar físico.' },
			{ name: 'Capilar', desc: 'Salud capilar y estética avanzada para el cabello.' },
			{ name: 'Bienestar', desc: 'Rituales holísticos y masajes para el equilibrio mental y físico.' }
		]

		for (const cat of categoriesData) {
			await prisma.category.create({
				data: {
					name: cat.name,
					description: cat.desc,
					subcategories: {
						create: [
							{ name: `${cat.name} Avanzado`, description: `Tecnología de punta aplicada a ${cat.name}` },
							{ name: `${cat.name} Esencial`, description: `Cuidados diarios y básicos de ${cat.name}` }
						]
					}
				}
			})
		}

		const allSubcategories = await prisma.subcategory.findMany()
		await prisma.tag.createMany({
			data: [
				{ name: 'Vegano', color: '#10b981' },
				{ name: 'Bestseller', color: '#f59e0b' },
				{ name: 'Novedad', color: '#3b82f6' },
				{ name: 'Oferta', color: '#ef4444' },
				{ name: 'Orgánico', color: '#84cc16' },
				{ name: 'Sin Parabenos', color: '#06b6d4' }
			]
		})
		const allTags = await prisma.tag.findMany()

		for (let i = 0; i < 25; i++) {
			const sub = getRandomItem(allSubcategories)
			await prisma.product.create({
				data: {
					name: getRandomItem(productBaseNames) + ' ' + (i + 1),
					description: 'Fórmula enriquecida con activos botánicos.',
					price: Number((20 + Math.random() * 80).toFixed(2)),
					stock: 10 + Math.floor(Math.random() * 40),
					min_stock: 5,
					category_id: sub.category_id,
					subcategory_id: sub.subcategory_id,
					status: 'activo',
					tags: { create: [{ tag_id: getRandomItem(allTags).tag_id }] }
				}
			})
		}

		for (const s of serviceBaseNames) {
			await prisma.service.create({
				data: {
					name: s.name,
					description: s.desc,
					price: s.price,
					duration: s.duration
				}
			})
		}
		const allServices = await prisma.service.findMany()

		console.log('🎟️ Seeding Marketing & CRM Data...')
		await prisma.coupon.createMany({
			data: [
				{ code: 'BELLEZA2026', discount_type: 'percentage', discount_value: 15, description: 'Descuento especial temporada' },
				{ code: 'BIENVENIDA', discount_type: 'fixed', discount_value: 5, description: 'Bono bienvenida nuevos clientes' }
			]
		})

		for (const client of allUsers) {
			// Consents (70% conversion)
			if (Math.random() > 0.3) {
				await prisma.consent.create({
					data: {
						user_id: client.user_id,
						signed_date: new Date(),
						document_url: `/multimedia/archivos/${client.user_id}_consent.pdf`,
						notes: 'Firmado digitalmente.'
					}
				}).catch(() => {})
			}

			// Questionnaires (50% conversion)
			if (Math.random() > 0.5) {
				await prisma.questionnaire.create({
					data: {
						user_id: client.user_id,
						title: 'Ficha Técnica Inicial',
						data: {
							skin_type: getRandomItem(['Grassa', 'Mixta', 'Seca', 'Sensible']),
							allergies: getRandomItem(['Ninguna', 'Polen', 'Látex', 'Metales'])
						}
					}
				})
			}

			// Bookings
			const numBookings = 1 + Math.floor(Math.random() * 3)
			for (let i = 0; i < numBookings; i++) {
				const isPast = Math.random() > 0.4
				const date = new Date()
				date.setDate(date.getDate() + (isPast ? -15 : 15) * (i + 1))
				const hour = 9 + Math.floor(Math.random() * 10)

				await prisma.booking.create({
					data: {
						client_id: client.user_id,
						staff_id: getRandomItem(staffMembers).user_id,
						item_type: 'service',
						item_id: getRandomItem(allServices).service_id,
						status: isPast ? 'completed' : 'pending',
						booking_date: date,
						start_time: `${hour.toString().padStart(2, '0')}:00`,
						end_time: `${(hour + 1).toString().padStart(2, '0')}:00`,
						duration: 60
					}
				})
			}

			// Debts (20% conversion)
			if (Math.random() > 0.8) {
				const amount = 50 + Math.random() * 150
				await prisma.debt.create({
					data: {
						user_id: client.user_id,
						amount,
						remaining: amount,
						status: 'pending',
						due_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days from now
						notes: 'Tratamiento pack avanzado pendiente de pago.'
					}
				})
			}
		}

		console.log('✅ Database seeded successfully!')
	} catch (error: any) {
		console.error('❌ Critical Seed Error:', error.stack || error.message || error)
	} finally {
		await prisma.$disconnect()
	}
}

seedDB()
