/* eslint-disable @typescript-eslint/no-explicit-any -- loose fakes standing in for prisma rows */
import { describe, it, before, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createError } from 'h3'
import { assertWithinSalesLimit, parseDateRange, SALES_FETCH_TAKE, SALES_LIST_LIMIT } from '../server/utils/date-range'
import { salesFetchRange } from '../app/utils/salesFetchRange'

describe('assertWithinSalesLimit', () => {
	it('returns the rows when they fit within the limit', () => {
		const rows = Array.from({ length: SALES_LIST_LIMIT }, (_, i) => i)
		assert.equal(assertWithinSalesLimit(rows), rows)
	})

	it('refuses a result over the limit instead of silently cutting it', () => {
		const rows = Array.from({ length: SALES_LIST_LIMIT + 1 }, (_, i) => i)
		assert.throws(
			() => assertWithinSalesLimit(rows),
			(error: any) => error.statusCode === 400 && /más de 1000 ventas/.test(error.statusMessage),
		)
	})
})

describe('parseDateRange', () => {
	it('returns undefined without from/to (blank values count as absent)', () => {
		assert.equal(parseDateRange({}), undefined)
		assert.equal(parseDateRange({ from: '', to: '' }), undefined)
	})

	it('reads date-only values as UTC days, with `to` inclusive up to the end of that day', () => {
		const range = parseDateRange({ from: '2026-03-01', to: '2026-03-31' })!
		assert.equal(range.gte!.toISOString(), '2026-03-01T00:00:00.000Z')
		assert.equal(range.lte!.toISOString(), '2026-03-31T23:59:59.999Z')
	})

	it('accepts a single open end and full ISO datetimes as they are', () => {
		assert.deepEqual(Object.keys(parseDateRange({ from: '2026-03-01' })!), ['gte'])
		assert.equal(parseDateRange({ to: '2026-03-01T10:00:00.000Z' })!.lte!.toISOString(), '2026-03-01T10:00:00.000Z')
	})

	it('rejects invalid dates and inverted ranges with a 400', () => {
		for (const q of [{ from: 'nope' }, { from: '2026-04-01', to: '2026-03-01' }]) {
			assert.throws(() => parseDateRange(q), (e: any) => e.statusCode === 400)
		}
	})
})

describe('salesFetchRange', () => {
	const base = { mode: 'single' as const, single: '', range: { start: '', end: '' }, timeframe: 'all' as const, quarter: 1, year: 2026, now: new Date('2026-05-10T12:00:00Z') }

	it('pads a manual single day by one day each side (the client filter is exact)', () => {
		assert.deepEqual(salesFetchRange({ ...base, single: '2026-03-10' }), { from: '2026-03-09', to: '2026-03-11' })
	})

	it('uses a manual range, leaving a missing end open', () => {
		assert.deepEqual(salesFetchRange({ ...base, mode: 'range', range: { start: '2026-03-01', end: '2026-03-31' } }), { from: '2026-02-28', to: '2026-04-01' })
		assert.deepEqual(salesFetchRange({ ...base, mode: 'range', range: { start: '2026-03-01', end: '' } }), { from: '2026-02-28' })
	})

	it('all time stays unbounded (the server safety limit applies)', () => {
		assert.deepEqual(salesFetchRange(base), {})
	})

	it('year/quarter fetch the selected year plus the previous one for period comparisons', () => {
		assert.deepEqual(salesFetchRange({ ...base, timeframe: 'year', year: 2025 }), { from: '2024-01-01', to: '2026-01-01' })
	})

	it('day/week/month fetch from the start of last year', () => {
		assert.deepEqual(salesFetchRange({ ...base, timeframe: 'month' }), { from: '2025-01-01' })
	})
})

type Row = Record<string, any>
let calls: Row[]
let query: Row
const g = globalThis as Record<string, unknown>
let getCarts: (e: unknown) => Promise<any>
let getPayments: (e: unknown) => Promise<any>
let getSummary: (e: unknown) => Promise<any>
let aggregateResult: Row

before(async () => {
	g.defineEventHandler = (fn: unknown) => fn
	g.getQuery = () => query
	g.createError = createError
	g.prisma = {
		cart: {
			findMany: async (args: Row) => (calls.push(args), []),
			aggregate: async (args: Row) => (calls.push(args), aggregateResult),
		},
		debtPayment: { findMany: async (args: Row) => (calls.push(args), []) },
	}
	getCarts = (await import('../server/api/sales/carts/index')).default as any
	getPayments = (await import('../server/api/sales/debt-payments.get')).default as any
	getSummary = (await import('../server/api/sales/summary.get')).default as any
})

beforeEach(() => {
	calls = []
	query = {}
	aggregateResult = { _sum: { total: 0 }, _count: 0 }
})

const getEvent = { node: { req: { method: 'GET' } } }

describe('GET /api/sales/carts date range', () => {
	it('keeps working without a range, adding only the safety limit', async () => {
		await getCarts(getEvent)
		assert.equal(calls[0]!.where.created_at, undefined)
		assert.equal(calls[0]!.take, SALES_FETCH_TAKE)
	})

	it('filters by created_at inside the range', async () => {
		query = { from: '2026-03-01', to: '2026-03-31', status: 'completed' }
		await getCarts(getEvent)
		assert.equal(calls[0]!.where.status, 'completed')
		assert.equal(calls[0]!.where.created_at.gte.toISOString(), '2026-03-01T00:00:00.000Z')
		assert.equal(calls[0]!.where.created_at.lte.toISOString(), '2026-03-31T23:59:59.999Z')
	})
})

describe('GET /api/sales/debt-payments date range', () => {
	it('is bounded even without a range', async () => {
		await getPayments(getEvent)
		assert.equal(calls[0]!.where, undefined)
		assert.equal(calls[0]!.take, SALES_FETCH_TAKE)
	})

	it('filters by payment_date inside the range', async () => {
		query = { from: '2026-03-01', to: '2026-03-31' }
		await getPayments(getEvent)
		assert.equal(calls[0]!.where.payment_date.gte.toISOString(), '2026-03-01T00:00:00.000Z')
		assert.equal(calls[0]!.where.payment_date.lte.toISOString(), '2026-03-31T23:59:59.999Z')
	})
})

describe('GET /api/sales/summary', () => {
	it('aggregates completed sales only, for both the current and the previous period', async () => {
		query = { from: '2026-03-01', to: '2026-03-31', prevFrom: '2026-02-01', prevTo: '2026-02-28' }
		aggregateResult = { _sum: { total: 1234.5 }, _count: 7 }
		const res = await getSummary(getEvent)

		assert.equal(calls.length, 2)
		assert.equal(calls[0]!.where.status, 'completed')
		assert.equal(calls[0]!.where.created_at.gte.toISOString(), '2026-03-01T00:00:00.000Z')
		assert.equal(calls[0]!.where.created_at.lte.toISOString(), '2026-03-31T23:59:59.999Z')
		assert.equal(calls[1]!.where.created_at.gte.toISOString(), '2026-02-01T00:00:00.000Z')
		assert.equal(calls[1]!.where.created_at.lte.toISOString(), '2026-02-28T23:59:59.999Z')
		assert.deepEqual(res, { current: { total: 1234.5, count: 7 }, previous: { total: 1234.5, count: 7 } })
	})

	it('treats a missing sum as 0 instead of null, and works without any range', async () => {
		aggregateResult = { _sum: { total: null }, _count: 0 }
		const res = await getSummary(getEvent)
		assert.equal(calls[0]!.where.created_at, undefined)
		assert.deepEqual(res, { current: { total: 0, count: 0 }, previous: { total: 0, count: 0 } })
	})
})
