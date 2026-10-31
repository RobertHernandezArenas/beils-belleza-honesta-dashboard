import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createKeyedMutex } from '../server/utils/keyed-mutex'

const defer = () => {
	let resolve!: (v?: unknown) => void
	const promise = new Promise(r => (resolve = r))
	return { promise, resolve }
}

describe('createKeyedMutex', () => {
	it('serializes calls for the same key: the second never starts before the first settles', async () => {
		const withLock = createKeyedMutex()
		const order: string[] = []
		const first = defer()

		const call1 = withLock('user-1', async () => {
			order.push('1-start')
			await first.promise
			order.push('1-end')
			return 'a'
		})
		const call2 = withLock('user-1', async () => {
			order.push('2-start')
			return 'b'
		})

		// Give call2 a chance to run if (incorrectly) not serialized
		await Promise.resolve()
		await Promise.resolve()
		assert.deepEqual(order, ['1-start'])

		first.resolve()
		assert.equal(await call1, 'a')
		assert.equal(await call2, 'b')
		assert.deepEqual(order, ['1-start', '1-end', '2-start'])
	})

	it('runs calls for different keys concurrently, not serialized', async () => {
		const withLock = createKeyedMutex()
		const order: string[] = []
		const first = defer()

		const call1 = withLock('user-1', async () => {
			order.push('1-start')
			await first.promise
			order.push('1-end')
		})
		const call2 = withLock('user-2', async () => {
			order.push('2-start')
		})

		await call2
		first.resolve()
		await call1
		assert.deepEqual(order, ['1-start', '2-start', '1-end'])
	})

	it('keeps the queue moving after a rejection, without poisoning later calls', async () => {
		const withLock = createKeyedMutex()

		await assert.rejects(
			withLock('user-1', async () => {
				throw new Error('boom')
			}),
			/boom/,
		)

		assert.equal(await withLock('user-1', async () => 'ok-after-rejection'), 'ok-after-rejection')
	})

	it('bounds concurrency to one in-flight run per key under real parallel calls', async () => {
		const withLock = createKeyedMutex()
		let concurrent = 0
		let maxConcurrent = 0

		const run = () =>
			withLock('shared', async () => {
				concurrent++
				maxConcurrent = Math.max(maxConcurrent, concurrent)
				await new Promise(r => setTimeout(r, 5))
				concurrent--
			})

		await Promise.all(Array.from({ length: 10 }, run))
		assert.equal(maxConcurrent, 1)
	})
})
