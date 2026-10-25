import { randomBytes } from 'node:crypto'

/**
 * Safety rails for scripts that wipe or reseed the database (db:reset-empty, seed).
 * They only run against a local, non-production database unless explicitly confirmed with
 * ALLOW_DESTRUCTIVE_DB=yes, and production is refused even then.
 */

type Env = Record<string, string | undefined>

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', ''])

export function isDestructiveAllowed(env: Env) {
	if (env.NODE_ENV === 'production') return false
	if (LOCAL_HOSTS.has((env.DATABASE_HOST || '').trim())) return true
	return env.ALLOW_DESTRUCTIVE_DB === 'yes'
}

export function assertDestructiveAllowed(env: Env, script: string) {
	if (!isDestructiveAllowed(env)) {
		console.error(
			`❌ ${script} borra datos y solo puede ejecutarse contra una base local que no sea de producción.\n` +
				`   DATABASE_HOST=${env.DATABASE_HOST || '(vacío)'} NODE_ENV=${env.NODE_ENV || '(vacío)'}\n` +
				'   Para una base remota de pruebas, confirma con ALLOW_DESTRUCTIVE_DB=yes (nunca en producción).',
		)
		process.exit(1)
	}
}

/** Seed admin/staff password: SEED_ADMIN_PASSWORD (min 8) or a random one, never a shared default. */
export function resolveSeedPassword(env: Env) {
	const fromEnv = env.SEED_ADMIN_PASSWORD?.trim()
	if (fromEnv && fromEnv.length >= 8) return { password: fromEnv, generated: false }
	return { password: randomBytes(12).toString('base64url'), generated: true }
}
