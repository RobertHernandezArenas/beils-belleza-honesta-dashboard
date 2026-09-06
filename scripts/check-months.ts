import 'dotenv/config'
import { prisma } from '../server/utils/prisma'

async function check() {
	const res = await prisma.cart.findMany({
		where: { status: 'completed' },
		select: { created_at: true },
		orderBy: { created_at: 'desc' }
	})
	const months = new Set(res.map(r => new Date(r.created_at).toISOString().substring(0, 7)))
	console.log('Total completed carts:', res.length)
	console.log('Distinct months in DB:', Array.from(months))
	if (res.length > 0) {
		console.log('Latest cart date:', res[0]?.created_at)
		console.log('Oldest cart date:', res[res.length - 1]?.created_at)
	}
	await prisma.$disconnect()
}
check()
