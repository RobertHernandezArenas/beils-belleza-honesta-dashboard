import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { resolveClientIp, createRateLimiter } from '../server/utils/rate-limit'

describe('resolveClientIp', () => {
	it('uses the socket address when not behind a proxy (forwarded headers are ignored)', () => {
		assert.equal(resolveClientIp({ remoteAddress: '203.0.113.9', forwardedFor: '1.2.3.4', trustedHops: 0 }), '203.0.113.9')
	})

	it('behind one trusted proxy, takes the entry that proxy appended (rightmost)', () => {
		assert.equal(
			resolveClientIp({ remoteAddress: '127.0.0.1', forwardedFor: '203.0.113.9', trustedHops: 1 }),
			'203.0.113.9',
		)
	})

	it('ignores IPs spoofed by the client in front of the real one', () => {
		assert.equal(
			resolveClientIp({ remoteAddress: '127.0.0.1', forwardedFor: '6.6.6.6, 7.7.7.7, 203.0.113.9', trustedHops: 1 }),
			'203.0.113.9',
		)
	})

	it('supports more than one trusted hop (e.g. Cloudflare in front of nginx)', () => {
		assert.equal(
			resolveClientIp({ remoteAddress: '127.0.0.1', forwardedFor: '6.6.6.6, 203.0.113.9, 172.68.1.1', trustedHops: 2 }),
			'203.0.113.9',
		)
	})

	it('falls back to the socket address when the header is missing', () => {
		assert.equal(resolveClientIp({ remoteAddress: '127.0.0.1', forwardedFor: undefined, trustedHops: 1 }), '127.0.0.1')
	})
})

describe('createRateLimiter', () => {
	it('allows up to the limit within the window, then blocks with a retry time', () => {
		const limiter = createRateLimiter({ limit: 3, windowMs: 60_000 })
		const t0 = 1_000_000
		assert.equal(limiter.hit('ip', t0).allowed, true)
		assert.equal(limiter.hit('ip', t0 + 1).allowed, true)
		assert.equal(limiter.hit('ip', t0 + 2).allowed, true)
		const blocked = limiter.hit('ip', t0 + 3)
		assert.equal(blocked.allowed, false)
		assert.equal(blocked.retryAfterSeconds, 60)
	})

	it('counts each key separately and resets after the window', () => {
		const limiter = createRateLimiter({ limit: 1, windowMs: 1_000 })
		assert.equal(limiter.hit('a', 0).allowed, true)
		assert.equal(limiter.hit('b', 0).allowed, true)
		assert.equal(limiter.hit('a', 500).allowed, false)
		assert.equal(limiter.hit('a', 1_001).allowed, true)
	})

	it('prunes expired entries so memory does not grow forever', () => {
		const limiter = createRateLimiter({ limit: 5, windowMs: 1_000 })
		for (let i = 0; i < 100; i++) limiter.hit(`ip-${i}`, 0)
		assert.equal(limiter.size(), 100)
		limiter.prune(2_000)
		assert.equal(limiter.size(), 0)
	})
})
