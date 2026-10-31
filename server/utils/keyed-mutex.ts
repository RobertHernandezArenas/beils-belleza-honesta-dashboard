/**
 * Serializes async work by key within this process. A call for a key that already has
 * work queued waits for it to settle (whether it resolved or rejected) before running,
 * so two calls for the same key never execute concurrently. Calls for different keys
 * run independently.
 *
 * Used to close login-lockout races: it makes the whole check-verify-update sequence
 * for one account atomic with respect to other requests for that same account, instead
 * of just the counter write.
 */
export function createKeyedMutex() {
	const queues = new Map<string, Promise<void>>()

	return function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
		const previous = queues.get(key) ?? Promise.resolve()
		const run = previous.then(fn, fn)
		const settled = run.then(() => undefined, () => undefined)

		queues.set(key, settled)
		settled.then(() => {
			// Only this call's own entry is still queued (no one chained after it): free it.
			if (queues.get(key) === settled) queues.delete(key)
		})

		return run
	}
}
