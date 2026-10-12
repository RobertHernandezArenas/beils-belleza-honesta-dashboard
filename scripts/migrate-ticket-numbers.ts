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

async function main() {
	const isApply = process.argv.includes('--apply')
	const modeText = isApply ? 'APPLY (En vivo)' : 'DRY-RUN (Simulación sin cambios)'

	console.log(`=======================================================`)
	console.log(`🛠️  MIGRACIÓN DE CORRELATIVIDAD FISCAL (ORDEN DE AGENDA)`)
	console.log(`Modo de ejecución: ${modeText}`)
	console.log(`=======================================================\n`)

	// 1. Obtener todos los carritos completados con factura emitida ordenados por fecha de cita/agenda (created_at)
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

	// Identificar el cierre de julio 2026 (Pilar Cancela - 0231)
	const julyCarts = carts.filter(c => c.invoice_number?.startsWith('BBH-07-2026-'))
	let startingSeq = 232

	if (julyCarts.length > 0) {
		const lastJuly = julyCarts[julyCarts.length - 1]
		const match = lastJuly?.invoice_number?.match(/-(\d+)$/)
		if (match && match[1]) {
			startingSeq = parseInt(match[1], 10) + 1
			console.log(`📍 Cierre detectado en julio: ${lastJuly.invoice_number} -> Siguiente serie comenzará en: ${startingSeq.toString().padStart(4, '0')}`)
		}
	} else {
		console.log(`ℹ️  No se encontraron tickets de julio. Usando valor inicial por defecto: ${startingSeq}`)
	}

	// Filtrar carritos correspondientes a agosto, septiembre y octubre
	const augCarts = carts.filter(c => c.invoice_number?.startsWith('BBH-08-2026-'))

	// Septiembre incluye los emitidos en septiembre y el ticket del 30/09 (Kathryn McCrary)
	const sepCarts = carts.filter(c => {
		if (c.invoice_number?.startsWith('BBH-09-2026-')) return true
		const d = new Date(c.created_at)
		return Boolean(c.invoice_number?.startsWith('BBH-10-2026-') && d < new Date('2026-10-01T00:00:00Z'))
	})

	// Octubre incluye únicamente los emitidos a partir del 1 de octubre
	const octCarts = carts.filter(c => {
		if (!c.invoice_number?.startsWith('BBH-10-2026-')) return false
		const d = new Date(c.created_at)
		return d >= new Date('2026-10-01T00:00:00Z')
	})

	// REGLA CRÍTICA: Ordenar cada grupo estrictamente por FECHA Y HORA DE AGENDA (created_at ASC)
	augCarts.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
	sepCarts.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
	octCarts.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

	console.log(`\nDistribución de tickets a reordenar según la agenda:`)
	console.log(` - Agosto:     ${augCarts.length} tickets`)
	console.log(` - Septiembre: ${sepCarts.length} tickets`)
	console.log(` - Octubre:    ${octCarts.length} tickets`)
	console.log(` - Total:      ${augCarts.length + sepCarts.length + octCarts.length} tickets`)

	let currentSeq = startingSeq
	const plan: MigrationPlanItem[] = []

	const processGroup = (groupCarts: typeof carts, month: string) => {
		for (const cart of groupCarts) {
			const newInvoice = `BBH-${month}-2026-${currentSeq.toString().padStart(4, '0')}`
			const newQr = cart.qr_content
				? cart.qr_content.replace(cart.invoice_number!, newInvoice)
				: null

			plan.push({
				cart_id: cart.cart_id,
				old_invoice: cart.invoice_number!,
				new_invoice: newInvoice,
				old_qr: cart.qr_content,
				new_qr: newQr,
				client_name: `${cart.user?.name || ''} ${cart.user?.surname || ''}`.trim() || 'Cliente Sin Nombre',
				date: cart.created_at.toISOString()
			})
			currentSeq++
		}
	}

	processGroup(augCarts, '08')
	processGroup(sepCarts, '09')
	processGroup(octCarts, '10')

	const finalSeq = currentSeq - 1

	if (plan.length === 0) {
		console.log('\n⚠️  No hay tickets para migrar.')
		return
	}

	console.log(`\n-------------------------------------------------------`)
	console.log(`📋 PUNTOS DE CONTROL CLAVE EN EL PLAN DE MIGRACIÓN`)
	console.log(`-------------------------------------------------------`)
	console.log(`Primer ticket a actualizar:   ${plan[0]?.old_invoice} ➔ ${plan[0]?.new_invoice} (${plan[0]?.client_name})`)
	
	const kathryn = plan.find(p => p.client_name.includes('Kathryn') && p.date.startsWith('2026-09-30'))
	const pilarPardo = plan.find(p => p.client_name.includes('Pilar  Pardo') && p.date.startsWith('2026-09-30'))
	if (kathryn && pilarPardo) {
		console.log(`Imagen 1 (30/09, 12:30):      ${kathryn.old_invoice} ➔ ${kathryn.new_invoice} (Kathryn McCrary)`)
		console.log(`Imagen 1 (30/09, 19:05):      ${pilarPardo.old_invoice} ➔ ${pilarPardo.new_invoice} (Pilar Pardo)`)
	}

	const anaH = plan.find(p => p.client_name.includes('Ana  Hernandez') && p.date.startsWith('2026-10-01'))
	const carmenOct = plan.find(p => p.client_name.includes('Carmen Suarez') && p.date.startsWith('2026-10-02'))
	if (anaH && carmenOct) {
		console.log(`Imagen 2 (01/10, 19:14):      ${anaH.old_invoice} ➔ ${anaH.new_invoice} (Ana Hernandez)`)
		console.log(`Imagen 2 (02/10, 12:31):      ${carmenOct.old_invoice} ➔ ${carmenOct.new_invoice} (Carmen Suarez)`)
	}

	console.log(`Último ticket a actualizar:   ${plan[plan.length - 1]?.old_invoice} ➔ ${plan[plan.length - 1]?.new_invoice} (${plan[plan.length - 1]?.client_name})`)
	console.log(`Valor de la secuencia anual 'invoice_2026': ${finalSeq}`)
	console.log(`-------------------------------------------------------\n`)

	if (!isApply) {
		console.log(`⚠️  SIMULACIÓN COMPLETADA (DRY-RUN).`)
		console.log(`Para ejecutar los cambios en la base de datos real, ejecuta:`)
		console.log(`pnpm exec tsx --env-file=.env ./scripts/migrate-ticket-numbers.ts --apply\n`)
		return
	}

	console.log(`⚙️  Aplicando actualización en 2 fases para evitar colisiones de unicidad...`)

	await prisma.$transaction(
		async (tx) => {
			// FASE 1: Prefijar con TEMP para liberar números que intercambian orden
			console.log(`   ⏳ Fase 1/2: Asignando prefijos temporales...`)
			for (const item of plan) {
				const tempInvoice = `TEMP-${item.cart_id.substring(0, 8)}-${item.old_invoice}`
				await tx.cart.update({
					where: { cart_id: item.cart_id },
					data: { invoice_number: tempInvoice }
				})
			}

			// FASE 2: Asignar número definitivo correlativo y actualizar QR
			console.log(`   ⏳ Fase 2/2: Asignando numeración definitiva correlativa...`)
			let count = 0
			for (const item of plan) {
				await tx.cart.update({
					where: { cart_id: item.cart_id },
					data: {
						invoice_number: item.new_invoice,
						qr_content: item.new_qr
					}
				})
				count++
				if (count % 25 === 0 || count === plan.length) {
					console.log(`      Actualizados ${count}/${plan.length} tickets...`)
				}
			}

			// 1. Fijar secuencia anual con el último valor emitido
			await tx.sequence.upsert({
				where: { type: 'invoice_2026' },
				update: { last_value: finalSeq },
				create: {
					type: 'invoice_2026',
					prefix: 'BBH',
					year: 2026,
					last_value: finalSeq
				}
			})
			console.log(`   ✅ Secuencia anual 'invoice_2026' establecida en ${finalSeq}`)

			// 2. Limpiar secuencias mensuales residuales si existen
			const deletedMonthly = await tx.sequence.deleteMany({
				where: {
					type: {
						in: ['invoice_2026_07', 'invoice_2026_08', 'invoice_2026_09', 'invoice_2026_10']
					}
				}
			})
			if (deletedMonthly.count > 0) {
				console.log(`   🧹 Secuencias mensuales residuales eliminadas: ${deletedMonthly.count}`)
			}
		},
		{
			maxWait: 20000,
			timeout: 120000
		}
	)

	console.log(`\n🎉 ¡MIGRACIÓN COMPLETADA EXITOSAMENTE!`)
	console.log(`Todos los tickets han sido renumerados estrictamente según la fecha y hora de la agenda.\n`)
}

main()
	.catch((error) => {
		console.error('\n❌ Error durante la migración:', error)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
