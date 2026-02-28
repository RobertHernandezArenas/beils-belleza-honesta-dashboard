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

function getRandomItem<T>(arr: readonly T[] | T[]): T {
	return arr[Math.floor(Math.random() * arr.length)]
}

function getRandomNumber(min: number, max: number): string {
	return Math.floor(Math.random() * (max - min + 1) + min).toString()
}

async function seedDB() {
	try {
		console.log('Cleaning up existing users...')
		await prisma.user.deleteMany()

		console.log('Seeding new users...')

		const defaultPassword = 'password123'
		const hashedPassword = await bcrypt.hash(defaultPassword, 10)

		const users = Array.from({ length: 20 }).map((_, i) => {
			const name = getRandomItem(names)
			const surname = getRandomItem(surnames)
			const role = getRandomItem(roles)
			const status = getRandomItem(statuses)
			const docType = getRandomItem(documentTypes)
			const gender = getRandomItem(genders)
			const city = getRandomItem(cities)
			const birthYear = 1980 + Math.floor(Math.random() * 20)
			const birthMonth = Math.floor(Math.random() * 12)
			const birthDay = Math.floor(Math.random() * 28) + 1

			return {
				email: `user${i + 1}@example.com`,
				password: hashedPassword,
				name,
				surname,
				phone: `+34${getRandomNumber(600000000, 699999999)}`,
				address: `Calle Falsa ${getRandomNumber(1, 100)}`,
				city,
				country: 'Spain',
				postal_code: getRandomNumber(10000, 52000),
				gender,
				birth_date: new Date(birthYear, birthMonth, birthDay),
				role,
				status,
				avatar: `https://ui-avatars.com/api/?name=${name}+${surname}&background=random`,
				document_type: docType,
				document_number: `${getRandomNumber(10000000, 99999999)}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`,
			}
		})

		await prisma.user.createMany({
			data: users,
		})

		console.log('✅ Database seeded successfully with 20 users')
		console.log(`Default password for all users is: '${defaultPassword}'`)
	} catch (error) {
		console.error('❌ Error seeding database:', error)
	} finally {
		await prisma.$disconnect()
	}
}

seedDB()
