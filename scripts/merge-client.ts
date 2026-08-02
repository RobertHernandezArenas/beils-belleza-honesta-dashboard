/**
 * Merge one client into another, then delete the source client.
 *
 * Moves ALL records that reference the source client (bookings, carts/tickets,
 * debts, client packages/bonos, consents, questionnaires, revokes) onto the
 * target client, then deletes the source user. Everything runs in a single
 * transaction, so it either fully succeeds or rolls back.
 *
 * ⚠️  DESTRUCTIVE. Take a database backup first.
 *
 * Usage (dry-run by default — prints what WOULD move, changes nothing):
 *   pnpx tsx --env-file=.env ./scripts/merge-client.ts \
 *     --from="antonella@correo.com" --to="delligattiantonella@gmail.com"
 *
 * To actually apply it, add --confirm:
 *   pnpx tsx --env-file=.env ./scripts/merge-client.ts \
 *     --from="antonella@correo.com" --to="delligattiantonella@gmail.com" --confirm
 *
 * `--from` / `--to` accept either an email or a user_id.
 */
import 'dotenv/config'
import pkg from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'

const { PrismaClient } = pkg

const prisma = new PrismaClient({
	adapter: new PrismaMariaDb({
		host: process.env.DATABASE_HOST || 'localhost',
		user: process.env.DATABASE_USER,
		password: process.env.DATABASE_PASSWORD,
		database: process.env.DATABASE_NAME,
		port: parseInt(process.env.DATABASE_PORT || '3306', 10),
		connectionLimit: 5,
		allowPublicKeyRetrieval: true,
	}),
})

const arg = (name: string) => {
	const hit = process.argv.find(a => a.startsWith(`--${name}=`))
	return hit ? hit.split('=').slice(1).join('=') : undefined
}
const CONFIRM = process.argv.includes('--confirm')

async function resolveClient(idOrEmail?: string) {
	if (!idOrEmail) return null
	return prisma.user.findFirst({
		where: {
			role: 'CLIENT',
			OR: [{ user_id: idOrEmail }, { email: idOrEmail }],
		},
	})
}

async function main() {
	const fromKey = arg('from')
	const toKey = arg('to')
	if (!fromKey || !toKey) {
		console.error('❌ Debes indicar --from y --to (email o user_id).')
		process.exit(1)
	}

	const source = await resolveClient(fromKey)
	const target = await resolveClient(toKey)

	if (!source) return console.error(`❌ Cliente origen no encontrado: ${fromKey}`)
	if (!target) return console.error(`❌ Cliente destino no encontrado: ${toKey}`)
	if (source.user_id === target.user_id) return console.error('❌ Origen y destino son el mismo cliente.')

	console.log(`\n🔀 Fusionar:`)
	console.log(`   ORIGEN  (se ELIMINARÁ): ${source.name} ${source.surname} <${source.email}> [${source.user_id}]`)
	console.log(`   DESTINO (recibe todo):  ${target.name} ${target.surname} <${target.email}> [${target.user_id}]\n`)

	// Summary of what will move
	const [bookings, carts, debts, packages, consents, questionnaires, revokes] = await Promise.all([
		prisma.booking.count({ where: { client_id: source.user_id } }),
		prisma.cart.count({ where: { user_id: source.user_id } }),
		prisma.debt.count({ where: { user_id: source.user_id } }),
		prisma.clientPackage.count({ where: { user_id: source.user_id } }),
		prisma.consent.count({ where: { user_id: source.user_id } }),
		prisma.questionnaire.count({ where: { user_id: source.user_id } }),
		prisma.revoke.count({ where: { user_id: source.user_id } }),
	])
	console.table({ bookings, carts, debts, client_packages: packages, consents, questionnaires, revokes })

	if (!CONFIRM) {
		console.log('\nℹ️  DRY-RUN. No se ha cambiado nada. Añade --confirm para aplicarlo (haz backup antes).')
		return
	}

	await prisma.$transaction(async tx => {
		const dest = target.user_id
		const src = source.user_id

		await tx.booking.updateMany({ where: { client_id: src }, data: { client_id: dest } })
		await tx.cart.updateMany({ where: { user_id: src }, data: { user_id: dest } })
		await tx.debt.updateMany({ where: { user_id: src }, data: { user_id: dest } })
		await tx.clientPackage.updateMany({ where: { user_id: src }, data: { user_id: dest } })
		await tx.questionnaire.updateMany({ where: { user_id: src }, data: { user_id: dest } })
		await tx.revoke.updateMany({ where: { user_id: src }, data: { user_id: dest } })

		// Consents have a unique (user_id, consent_type). Move only the types the
		// target doesn't already have; drop the source's duplicates.
		const targetConsentTypes = new Set(
			(await tx.consent.findMany({ where: { user_id: dest }, select: { consent_type: true } })).map(
				c => c.consent_type,
			),
		)
		const sourceConsents = await tx.consent.findMany({ where: { user_id: src } })
		for (const c of sourceConsents) {
			if (targetConsentTypes.has(c.consent_type)) {
				await tx.consent.delete({ where: { consent_id: c.consent_id } })
			} else {
				await tx.consent.update({ where: { consent_id: c.consent_id }, data: { user_id: dest } })
			}
		}

		// Finally remove the now-empty source client
		await tx.user.delete({ where: { user_id: src } })
	})

	console.log(`\n✅ Fusión completada. "${source.name} ${source.surname}" eliminado; todo movido a "${target.name} ${target.surname}".`)
}

main()
	.catch(e => {
		console.error('❌ Error (no se aplicó nada):', e)
		process.exit(1)
	})
	.finally(() => prisma.$disconnect())
