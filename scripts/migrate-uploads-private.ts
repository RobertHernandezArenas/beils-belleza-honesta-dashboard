/**
 * Moves uploads from public/uploads (reachable without login) to private storage
 * (UPLOADS_DIR or storage/uploads) and rewrites stored URLs /uploads/... -> /api/files/...
 *
 * Dry run by default:   npm run uploads:migrate
 * Apply:                npm run uploads:migrate:apply
 * Idempotent: files already moved and URLs already rewritten are skipped.
 */
import { readdir, mkdir, rename, copyFile, unlink, access } from 'node:fs/promises'
import { join, relative, dirname } from 'node:path'
import { prisma } from '../server/utils/prisma'
import { uploadsRoot, rewriteUploadUrls, LEGACY_PUBLIC_PREFIX } from '../server/utils/upload-storage'

const APPLY = process.argv.includes('--apply')
const SOURCE = join(process.cwd(), 'public', 'uploads')
const TARGET = uploadsRoot()

const exists = (p: string) => access(p).then(() => true, () => false)

async function* walk(dir: string): AsyncGenerator<string> {
	for (const entry of await readdir(dir, { withFileTypes: true })) {
		const full = join(dir, entry.name)
		if (entry.isDirectory()) yield* walk(full)
		else if (entry.isFile()) yield full
	}
}

async function moveFiles() {
	if (!(await exists(SOURCE))) {
		console.log(`📁 ${SOURCE} no existe: no hay archivos públicos que mover.`)
		return { moved: 0, skipped: 0 }
	}
	let moved = 0
	let skipped = 0
	for await (const file of walk(SOURCE)) {
		const dest = join(TARGET, relative(SOURCE, file))
		if (await exists(dest)) {
			skipped++
			continue
		}
		moved++
		if (!APPLY) continue
		await mkdir(dirname(dest), { recursive: true })
		// rename fails across devices/volumes: fall back to copy + delete
		await rename(file, dest).catch(async () => {
			await copyFile(file, dest)
			await unlink(file)
		})
	}
	return { moved, skipped }
}

async function rewriteUrls() {
	const like = { contains: `${LEGACY_PUBLIC_PREFIX}/` }
	const [users, consents, products] = await Promise.all([
		prisma.user.findMany({ where: { avatar: like }, select: { user_id: true, avatar: true } }),
		prisma.consent.findMany({ where: { notes: like }, select: { consent_id: true, notes: true } }),
		prisma.product.findMany({ where: { image_url: like }, select: { product_id: true, image_url: true } }),
	])

	if (APPLY) {
		await prisma.$transaction([
			...users.map(u => prisma.user.update({ where: { user_id: u.user_id }, data: { avatar: rewriteUploadUrls(u.avatar) } })),
			...consents.map(c =>
				prisma.consent.update({ where: { consent_id: c.consent_id }, data: { notes: rewriteUploadUrls(c.notes ?? '') } }),
			),
			...products.map(p =>
				prisma.product.update({ where: { product_id: p.product_id }, data: { image_url: rewriteUploadUrls(p.image_url ?? '') } }),
			),
		])
	}
	return { users: users.length, consents: consents.length, products: products.length }
}

async function main() {
	console.log(`${APPLY ? '🚚 APLICANDO' : '🔍 SIMULACIÓN (usa --apply para ejecutar)'}`)
	console.log(`   origen:  ${SOURCE}\n   destino: ${TARGET}`)
	const files = await moveFiles()
	const urls = await rewriteUrls()
	console.log(`📦 Archivos ${APPLY ? 'movidos' : 'a mover'}: ${files.moved} (ya en destino: ${files.skipped})`)
	console.log(
		`🔗 URLs ${APPLY ? 'reescritas' : 'a reescribir'}: avatares ${urls.users}, consentimientos ${urls.consents}, productos ${urls.products}`,
	)
	if (!APPLY) console.log('ℹ️  Nada se modificó.')
}

main()
	.catch(error => {
		console.error('❌ Error en la migración:', error)
		process.exitCode = 1
	})
	.finally(() => prisma.$disconnect())
