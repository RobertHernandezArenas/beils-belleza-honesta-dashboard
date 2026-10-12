import 'dotenv/config'
import { prisma } from '../server/utils/prisma'

async function main() {
	console.log(`=======================================================`)
	console.log(`🔍 VERIFICACIÓN DE ESTADO DE TICKETS Y SECUENCIAS`)
	console.log(`=======================================================\n`)

	// 1. Verificar secuencias en tabla sequences
	const sequences = await prisma.sequence.findMany({
		orderBy: { type: 'asc' }
	})
	console.log('📌 Secuencias registradas en tabla `sequences`:')
	for (const s of sequences) {
		console.log(`   - Tipo: ${s.type.padEnd(20)} | Año: ${s.year} | Último valor: ${s.last_value} | Actualizado: ${s.updated_at.toISOString()}`)
	}

	// 2. Comprobar tickets por mes
	const carts = await prisma.cart.findMany({
		where: { invoice_number: { not: null } },
		select: {
			invoice_number: true,
			created_at: true,
			qr_content: true,
			user: { select: { name: true, surname: true } }
		},
		orderBy: [
			{ created_at: 'asc' },
			{ cart_id: 'asc' }
		]
	})

	console.log(`\n📦 Total de tickets con factura en la base: ${carts.length}`)

	const monthMap = new Map<string, typeof carts>()
	for (const c of carts) {
		const prefix = c.invoice_number?.substring(0, 11) || 'otros'
		if (!monthMap.has(prefix)) monthMap.set(prefix, [])
		monthMap.get(prefix)!.push(c)
	}

	console.log('\n📊 Rango y volumen por mes:')
	for (const [prefix, list] of monthMap.entries()) {
		const first = list[0]?.invoice_number
		const last = list[list.length - 1]?.invoice_number
		console.log(`   - [${prefix}]: ${list.length.toString().padStart(3, ' ')} tickets (Rango: ${first} ➔ ${last})`)
	}

	// 3. Revisar tickets específicos clave
	const anaR = carts[0]
	const julyWrongItem = carts.find(c => c.user?.name?.includes('Cliente No Registrado') && c.created_at.toISOString().startsWith('2026-07-01T11:07') && c.invoice_number?.includes('0177'))
	const pilarCancela = carts.find(c => c.user?.name?.includes('Pilar') && c.user?.surname?.includes('Cancela'))
	const carmenAug = carts.find(c => c.user?.name?.includes('Carmen') && c.user?.surname?.includes('Suarez') && c.created_at.toISOString().startsWith('2026-08-03'))
	const saraAug = carts.find(c => c.user?.name?.includes('Sara') && c.created_at.toISOString().startsWith('2026-08-31'))
	const kathryn = carts.find(c => c.user?.name?.includes('Kathryn') && c.created_at.toISOString().startsWith('2026-09-30'))
	const pilarPardo = carts.find(c => c.user?.name?.includes('Pilar  Pardo') && c.created_at.toISOString().startsWith('2026-09-30'))
	const octFirst = carts.find(c => c.created_at.toISOString().startsWith('2026-10-01'))
	const lastTicket = carts[carts.length - 1]

	console.log('\n🎯 Puntos de control (según fecha y hora de la agenda):')
	if (anaR) console.log(`   - Ana Rabuñal (Primer Ticket):           ${anaR.invoice_number} | Fecha: ${anaR.created_at.toISOString()}`)
	if (julyWrongItem) console.log(`   - Ticket 01/Julio corregido:             ${julyWrongItem.invoice_number} | Fecha: ${julyWrongItem.created_at.toISOString()}`)
	if (pilarCancela) console.log(`   - Pilar Cancela (Cierre Julio):          ${pilarCancela.invoice_number} | Fecha: ${pilarCancela.created_at.toISOString()}`)
	if (carmenAug) console.log(`   - Carmen Suárez (Inicio Agosto):         ${carmenAug.invoice_number} | Fecha: ${carmenAug.created_at.toISOString()}`)
	if (saraAug) console.log(`   - Sara Sara (Cierre Agosto):             ${saraAug.invoice_number} | Fecha: ${saraAug.created_at.toISOString()}`)
	if (kathryn) console.log(`   - Kathryn McCrary (30/09 12:30):         ${kathryn.invoice_number} | Fecha: ${kathryn.created_at.toISOString()}`)
	if (pilarPardo) console.log(`   - Pilar Pardo (30/09 19:05 Cierre Sep):  ${pilarPardo.invoice_number} | Fecha: ${pilarPardo.created_at.toISOString()}`)
	if (octFirst) console.log(`   - Primer ticket de Octubre:              ${octFirst.invoice_number} | Fecha: ${octFirst.created_at.toISOString()}`)
	if (lastTicket) console.log(`   - Último ticket global:                   ${lastTicket.invoice_number} (${lastTicket.user?.name} ${lastTicket.user?.surname})`)

	console.log('\n✅ Verificación finalizada.')
}

main()
	.catch(console.error)
	.finally(() => prisma.$disconnect())
