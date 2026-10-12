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
		orderBy: { invoice_number: 'asc' }
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
	const pilar = carts.find(c => c.invoice_number?.includes('0231') || (c.user?.name?.includes('Pilar') && c.user?.surname?.includes('Cancela')))
	const carmen = carts.find(c => c.user?.name?.includes('Carmen') && c.user?.surname?.includes('Suarez') && c.invoice_number?.startsWith('BBH-08-'))
	const kathryn = carts.find(c => c.invoice_number === 'BBH-09-2026-0359')
	const pilarPardo = carts.find(c => c.invoice_number === 'BBH-09-2026-0360')
	const anaH = carts.find(c => c.invoice_number === 'BBH-10-2026-0363')
	const carmenOct = carts.find(c => c.invoice_number === 'BBH-10-2026-0364')
	const octFirst = carts.find(c => c.invoice_number?.startsWith('BBH-10-2026-0361'))

	console.log('\n🎯 Puntos de control (según fecha y hora de la agenda):')
	if (pilar) console.log(`   - Pilar Cancela (Cierre Julio):          ${pilar.invoice_number} | Fecha: ${pilar.created_at.toISOString()}`)
	if (carmen) console.log(`   - Carmen Suárez (Agosto):                ${carmen.invoice_number} | Fecha: ${carmen.created_at.toISOString()}`)
	if (kathryn) console.log(`   - Kathryn McCrary (30/09 12:30):         ${kathryn.invoice_number} | Fecha: ${kathryn.created_at.toISOString()}`)
	if (pilarPardo) console.log(`   - Pilar Pardo (30/09 19:05 Cierre Sep):  ${pilarPardo.invoice_number} | Fecha: ${pilarPardo.created_at.toISOString()}`)
	if (octFirst) console.log(`   - Primer ticket de Octubre:              ${octFirst.invoice_number} | Fecha: ${octFirst.created_at.toISOString()}`)
	if (anaH) console.log(`   - Ana Hernandez (01/10 19:14):           ${anaH.invoice_number} | Fecha: ${anaH.created_at.toISOString()}`)
	if (carmenOct) console.log(`   - Carmen Suarez (02/10 12:31):           ${carmenOct.invoice_number} | Fecha: ${carmenOct.created_at.toISOString()}`)

	// 4. Último ticket emitido
	const lastTicket = carts[carts.length - 1]
	if (lastTicket) {
		console.log(`   - Último ticket global:                   ${lastTicket.invoice_number} (${lastTicket.user?.name} ${lastTicket.user?.surname})`)
	}

	console.log('\n✅ Verificación finalizada.')
}

main()
	.catch(console.error)
	.finally(() => prisma.$disconnect())
