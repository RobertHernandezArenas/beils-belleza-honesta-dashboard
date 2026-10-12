import 'dotenv/config'
import { prisma } from '../server/utils/prisma'

interface SyncPlanItem {
	cart_id: string
	invoice_number: string | null
	booking_id: string
	client_name: string
	date: string
	amount: number
}

async function main() {
	const isApply = process.argv.includes('--apply')
	const modeText = isApply ? 'APPLY (En vivo)' : 'DRY-RUN (Simulación sin cambios)'

	console.log(`=======================================================`)
	console.log(`🔄 SINCRONIZACIÓN DE AGENDA Y VENTAS (FUENTE DE LA VERDAD)`)
	console.log(`Modo de ejecución: ${modeText}`)
	console.log(`=======================================================\n`)

	// 1. Encontrar carritos cobrados sin cita vinculada
	const unlinkedCompletedCarts = await prisma.cart.findMany({
		where: {
			status: 'completed',
			booking_id: null,
			user_id: { not: null },
		},
		include: {
			user: { select: { name: true, surname: true } },
		},
		orderBy: { created_at: 'asc' },
	})

	console.log(`📊 Total de ventas cobradas con booking_id nulo: ${unlinkedCompletedCarts.length}`)

	const planToLink: SyncPlanItem[] = []

	for (const cart of unlinkedCompletedCarts) {
		if (!cart.user_id) continue

		const cartDate = new Date(cart.created_at)
		const windowStart = new Date(Date.UTC(cartDate.getUTCFullYear(), cartDate.getUTCMonth(), cartDate.getUTCDate() - 1, 0, 0, 0, 0))
		const windowEnd = new Date(Date.UTC(cartDate.getUTCFullYear(), cartDate.getUTCMonth(), cartDate.getUTCDate() + 1, 23, 59, 59, 999))

		// Buscar cita del mismo cliente en ese rango de fecha que no tenga ya un carrito completado asignado
		const booking = await prisma.booking.findFirst({
			where: {
				client_id: cart.user_id,
				booking_date: { gte: windowStart, lte: windowEnd },
				status: { notIn: ['CANCELADA', 'AUSENTE'] },
				carts: { none: { status: 'completed' } },
			},
			orderBy: [
				{ booking_date: 'asc' },
				{ start_time: 'asc' },
			],
		})

		if (booking) {
			planToLink.push({
				cart_id: cart.cart_id,
				invoice_number: cart.invoice_number,
				booking_id: booking.booking_id,
				client_name: `${cart.user?.name || ''} ${cart.user?.surname || ''}`.trim(),
				date: cartDate.toISOString(),
				amount: cart.total,
			})
		}
	}

	console.log(`🎯 Ventas huérfanas que coinciden con citas de agenda: ${planToLink.length}`)

	// 2. Encontrar citas que tienen carrito completado pero status != 'COMPLETADA'
	const mismatchedBookings = await prisma.booking.findMany({
		where: {
			status: { not: 'COMPLETADA' },
			carts: { some: { status: 'completed' } },
		},
		include: {
			client: { select: { name: true, surname: true } },
		},
	})

	console.log(`⚠️  Citas vinculadas a ventas pero con status != COMPLETADA: ${mismatchedBookings.length}`)

	if (planToLink.length === 0 && mismatchedBookings.length === 0) {
		console.log(`\n✅ Todo el sistema ya se encuentra 100% sincronizado. No hay cambios pendientes.`)
		return
	}

	console.log(`\n📋 Muestra de operaciones a ejecutar (primeras 10):`)
	for (const item of planToLink.slice(0, 10)) {
		console.log(`   - Venta ${item.invoice_number} (${item.client_name}, ${item.amount} €) ➔ Cita [${item.booking_id}] (${item.date})`)
	}

	if (!isApply) {
		console.log(`\n💡 Para aplicar estas actualizaciones en la base de datos, ejecutá:`)
		console.log(`   pnpm run tickets:sync-agenda:apply`)
		return
	}

	console.log(`\n⚙️  Aplicando sincronización en base de datos...`)

	await prisma.$transaction(
		async tx => {
			// Paso A: Vincular carritos a citas y marcar las citas como COMPLETADA
			for (const item of planToLink) {
				await tx.cart.update({
					where: { cart_id: item.cart_id },
					data: { booking_id: item.booking_id },
				})

				await tx.booking.update({
					where: { booking_id: item.booking_id },
					data: { status: 'COMPLETADA' },
				})
			}

			// Paso B: Marcar como COMPLETADA cualquier cita que ya estuviera vinculada a una venta completada
			for (const b of mismatchedBookings) {
				await tx.booking.update({
					where: { booking_id: b.booking_id },
					data: { status: 'COMPLETADA' },
				})
			}
		},
		{
			maxWait: 20000,
			timeout: 120000,
		},
	)

	console.log(`✅ Sincronización aplicada exitosamente.`)
	console.log(`   - ${planToLink.length} ventas vinculadas a sus citas correspondientes.`)
	console.log(`   - ${planToLink.length + mismatchedBookings.length} citas actualizadas a status 'COMPLETADA'.`)
}

main()
	.catch(err => {
		console.error(`❌ Error durante la sincronización:`, err)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
