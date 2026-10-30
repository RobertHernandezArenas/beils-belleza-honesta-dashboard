/**
 * Account lockout after repeated failed logins. The 3rd consecutive failure locks the
 * account for 15 min; every further failure doubles it (capped at 24 h). A successful
 * login (or an admin unlock) resets the counter.
 */

export const MAX_FAILED_ATTEMPTS = 3
const BASE_LOCK_MINUTES = 15
const MAX_LOCK_MINUTES = 24 * 60

export function lockDurationMinutes(failedCount: number) {
	if (failedCount < MAX_FAILED_ATTEMPTS) return 0
	return Math.min(BASE_LOCK_MINUTES * 2 ** (failedCount - MAX_FAILED_ATTEMPTS), MAX_LOCK_MINUTES)
}

export function isLocked(lockedUntil: Date | string | null | undefined, now = new Date()) {
	return !!lockedUntil && new Date(lockedUntil) > now
}

export function lockedMessage(lockedUntil: Date | string, now = new Date()) {
	const minutes = Math.max(1, Math.ceil((new Date(lockedUntil).getTime() - now.getTime()) / 60_000))
	return `Cuenta bloqueada por ${MAX_FAILED_ATTEMPTS} intentos fallidos. Inténtalo de nuevo en ${minutes} min o contacta con un administrador.`
}

/**
 * Prisma filter for accounts that are not locked at `now`: the exact complement of isLocked.
 * Used as a conditional write so a lock set by a concurrent failure can't be bypassed by a
 * request that read the account before that lock existed.
 */
export function unlockedWhere(now = new Date()) {
	return { OR: [{ locked_until: null }, { locked_until: { lte: now } }] }
}
