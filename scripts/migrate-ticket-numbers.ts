import 'dotenv/config'
import { prisma } from '../server/utils/prisma'

interface MigrationPlanItem {
	cart_id: string
	old_invoice: string
	new_invoice: string
	old_qr: string | null
	new_qr: string | null
	client_name: string
	date: string
}

function getInvoiceMonthForDate(d: Date): string {
	if (d < new Date('2026-03-26T12:00:00Z')) {
		return '03'
	}
	if (d < new Date('2026-08-01T00:00:00Z')) {
		return '07'
	}
	if (d < new Date('2026-09-01T00:00:00Z')) {
		return '08'
	}
	if (d < new Date('2026-10-01T00:00:00Z')) {
		return '09'
	}
	return '10'
}

async function main() {
	const isApply = process.argv.includes('--apply')
	const modeText = isApply ? 'APPLY (En vivo)' : 'DRY-RUN (Simulación sin cambios)'

	console.log(`=======================================================`)
	console.log(`🛠️  MIGRACIÓN COMPLETA DE TICKETS (SECUENCIA 0001 A 0390)`)
	console.log(`Modo de ejecución: ${modeText}`)
	console.log(`=======================================================\n`)

	// 1. Obtener TODOS los carritos completados con factura ordenada por fecha de cita/agenda
	const carts = await prisma.cart.findMany({
		where: {
			invoice_number: { not: null }
		},
		select: {
			cart_id: true,
			invoice_number: true,
			qr_content: true,
			created_at: true,
			user: { select: { name: true, surname: true } }
		},
		orderBy: [
			{ created_at: 'asc' },
			{ cart_id: 'asc' }
		]
	})

	console.log(`📦 Total de tickets con factura encontrados en la base: ${carts.length}`)

	const plan: MigrationPlanItem[] = []
	const monthCounts: Record<string, number> = {}

	for (let i = 0; i < carts.length; i++) {
		const cart = carts[i]!
		const seq = (i + 1).toString().padStart(4, '0')
		const dateObj = new Date(cart.created_at)
		const month = getInvoiceMonthForDate(dateObj)

		monthCounts[month] = (monthCounts[month] || 0) + 1
		const newInvoice = `BBH-${month}-2026-${seq}`

		const newQr = cart.qr_content
			? cart.qr_content.replace(cart.invoice_number!, newInvoice)
			: null

		const clientName = `${cart.user?.name || ''} ${cart.user?.surname || ''}`.trim() || 'Cliente Sin Nombre'

		if (cart.invoice_number !== newInvoice || (cart.qr_content && cart.qr_content !== newQr)) {
			plan.push({
				cart_id: cart.cart_id,
				old_invoice: cart.invoice_number!,
				new_invoice: newInvoice,
				old_qr: cart.qr_content,
				new_qr: newQr,
				client_name: clientName,
				date: cart.created_at.toISOString()
			})
		}
	}

	console.log(`\n📊 Distribución de la secuencia anual continua:`)
	for (const [m, count] of Object.entries(monthCounts)) {
		console.log(`   - Mes ${m}/2026: ${count} tickets`)
	}

	console.log(`\n🔄 Tickets que requieren actualización: ${plan.length} de ${carts.length}`)

	console.log(`\n-------------------------------------------------------`)
	console.log(`📋 PUNTOS DE CONTROL CLAVE`)
	console.log(`-------------------------------------------------------`)
	console.log(`1. Primer ticket emitido:        BBH-03-2026-0001 (Ana Rabuñal)`)

	const julyWrongItem = plan.find(p => p.old_invoice === 'BBH-08-2026-0001')
	if (julyWrongItem) {
		console.log(`2. Corrección 01/Julio erróneo:   ${julyWrongItem.old_invoice} ➔ ${julyWrongItem.new_invoice}`)
	}

	const pilarCancela = carts.find(c => c.user?.name?.includes('Pilar') && c.user?.surname?.includes('Cancela'))
	if (pilarCancela) {
		const idx = carts.indexOf(pilarCancela)
		console.log(`3. Cierre Julio (Pilar Cancela):  ${pilarCancela.invoice_number} ➔ BBH-07-2026-${(idx + 1).toString().padStart(4, '0')}`)
	}

	const carmenAug = carts.find(c => c.user?.name?.includes('Carmen') && c.user?.surname?.includes('Suarez') && c.created_at.toISOString().startsWith('2026-08-03'))
	if (carmenAug) {
		const idx = carts.indexOf(carmenAug)
		console.log(`4. Inicio Agosto (Carmen Suarez): ${carmenAug.invoice_number} ➔ BBH-08-2026-${(idx + 1).toString().padStart(4, '0')}`)
	}

	const kathrynSep = carts.find(c => c.user?.name?.includes('Kathryn') && c.created_at.toISOString().startsWith('2026-09-30'))
	if (kathrynSep) {
		const idx = carts.indexOf(kathrynSep)
		console.log(`5. Cita 30/Sep 12:30 (Kathryn):   ${kathrynSep.invoice_number} ➔ BBH-09-2026-${(idx + 1).toString().padStart(4, '0')}`)
	}

	const pilarPardoSep = carts.find(c => c.user?.name?.includes('Pilar  Pardo') && c.created_at.toISOString().startsWith('2026-09-30'))
	if (pilarPardoSep) {
		const idx = carts.indexOf(pilarPardoSep)
		console.log(`6. Cierre 30/Sep 19:05 (Pilar P): ${pilarPardoSep.invoice_number} ➔ BBH-09-2026-${(idx + 1).toString().padStart(4, '0')}`)
	}

	const octFirst = carts.find(c => c.created_at.toISOString().startsWith('2026-10-01'))
	if (octFirst) {
		const idx = carts.indexOf(octFirst)
		console.log(`7. Inicio Octubre:               ${octFirst.invoice_number} ➔ BBH-10-2026-${(idx + 1).toString().padStart(4, '0')}`)
	}

	const lastCart = carts[carts.length - 1]!
	console.log(`8. Último ticket emitido:        ${lastCart.invoice_number} ➔ BBH-10-2026-${carts.length.toString().padStart(4, '0')} (${lastCart.user?.name} ${lastCart.user?.surname})`)
	console.log(`-------------------------------------------------------\n`)

	if (!isApply) {
		console.log(`⚠️  SIMULACIÓN COMPLETADA (DRY-RUN). No se realizaron cambios en la base de datos.`)
		console.log(`Para aplicar estos cambios en vivo, ejecuta:`)
		console.log(`   pnpm run tickets:migrate:apply\n`)
		return
	}

	console.log(`⚙️  Aplicando actualización en 2 fases en la base de datos...`)

	await prisma.$transaction(
		async (tx) => {
			// FASE 1: Prefijar con TEMP para liberar números y evitar colisiones @unique
			console.log(`   ⏳ Fase 1/2: Asignando prefijos temporales a ${plan.length} tickets...`)
			for (const item of plan) {
				const tempInvoice = `TEMP-${item.cart_id.substring(0, 8)}-${item.old_invoice}`
				await tx.cart.update({
					where: { cart_id: item.cart_id },
					data: { invoice_number: tempInvoice }
				})
			}

			// FASE 2: Asignar números definitivos y actualizar QR
			console.log(`   ⏳ Fase 2/2: Asignando secuencia definitiva y QRs...`)
			for (const item of plan) {
				await tx.cart.update({
					where: { cart_id: item.cart_id },
					data: {
						invoice_number: item.new_invoice,
						qr_content: item.new_qr
					}
				})
			}

			// FASE 3: Configurar secuencia anual unificada en tabla sequences
			console.log(`   ⏳ Fase 3/3: Actualizando tabla sequences...`)
			await tx.sequence.upsert({
				where: { type: 'invoice_2026' },
				create: {
					type: 'invoice_2026',
					prefix: 'BBH',
					year: 2026,
					last_value: carts.length
				},
				update: {
					last_value: carts.length
				}
			})

			// Limpiar secuencias mensuales obsoletas si existen
			await tx.sequence.deleteMany({
				where: {
					type: {
						in: ['invoice_2026_03', 'invoice_2026_07', 'invoice_2026_08', 'invoice_2026_09', 'invoice_2026_10']
					}
				}
			})
		},
		{
			maxWait: 30000,
			timeout: 180000
		}
	)

	console.log(`\n✅ ¡MIGRACIÓN COMPLETADA CON ÉXITO!`)
	console.log(`- ${plan.length} tickets reasignados a su número exacto en secuencia.`)
	console.log(`- Secuencia anual 'invoice_2026' establecida en: ${carts.length}.`)
	console.log(`- Próxima venta a emitir comenzará en: ${(carts.length + 1).toString().padStart(4, '0')}.\n`)
}

main()
	.catch(err => {
		console.error(`❌ Error durante la migración:`, err)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
