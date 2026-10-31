/* eslint-disable @typescript-eslint/no-explicit-any -- test fakes */
import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createCoupon } from '../server/modules/coupons/create-coupon'
import { updateCoupon } from '../server/modules/coupons/update-coupon'
import { deleteCoupon } from '../server/modules/coupons/delete-coupon'
import { listCoupons } from '../server/modules/coupons/list-coupons'
import type { CouponsRepository, CouponRecord, NewCouponInput, UpdateCouponInput } from '../server/modules/coupons/ports'

let couponsStore: CouponRecord[]

const buildCouponsRepo = (): CouponsRepository => ({
	findMany: async ({ search, onlyUsable }) => {
		let list = [...couponsStore]
		if (search) {
			list = list.filter(c => c.code.includes(search.toUpperCase()))
		}
		if (onlyUsable) {
			list = list.filter(c => c.status === 'activo')
		}
		return list.sort((a, b) => (b.created_at?.getTime() ?? 0) - (a.created_at?.getTime() ?? 0))
	},
	findById: async (id: string) => couponsStore.find(c => c.coupon_id === id) ?? null,
	findByCode: async (code: string) => couponsStore.find(c => c.code === code) ?? null,
	create: async (data: NewCouponInput) => {
		if (couponsStore.some(c => c.code === data.code)) {
			const err: any = new Error('Unique constraint failed')
			err.code = 'P2002'
			throw err
		}
		const record: CouponRecord = {
			coupon_id: `coup-${couponsStore.length + 1}`,
			code: data.code,
			discount_type: data.discount_type,
			discount_value: data.discount_value,
			min_purchase: data.min_purchase ?? null,
			max_uses: data.max_uses ?? null,
			current_uses: 0,
			valid_from: data.valid_from ?? null,
			valid_until: data.valid_until ?? null,
			status: data.status ?? 'activo',
			description: data.description ?? null,
			created_at: new Date(),
			updated_at: new Date(),
		}
		couponsStore.push(record)
		return record
	},
	update: async (id: string, data: UpdateCouponInput) => {
		const existing = couponsStore.find(c => c.coupon_id === id)
		if (!existing) {
			throw new Error('Not found')
		}
		if (data.code && couponsStore.some(c => c.code === data.code && c.coupon_id !== id)) {
			const err: any = new Error('Unique constraint failed')
			err.code = 'P2002'
			throw err
		}
		Object.assign(existing, data, { updated_at: new Date() })
		return existing
	},
	deleteOrDeactivate: async (id: string) => {
		const idx = couponsStore.findIndex(c => c.coupon_id === id)
		if (idx === -1) {
			const err: any = new Error('Cupón no encontrado')
			err.statusCode = 404
			throw err
		}
		const coupon = couponsStore[idx]
		if (coupon.current_uses === 0) {
			couponsStore.splice(idx, 1)
			return { deleted: true, deactivated: false }
		}
		coupon.status = 'inactivo'
		return { deleted: false, deactivated: true }
	},
})

describe('Coupons Module - Hexagonal Architecture', () => {
	beforeEach(() => {
		couponsStore = [
			{
				coupon_id: 'coup-1',
				code: 'WELCOME10',
				discount_type: 'percentage',
				discount_value: 10,
				min_purchase: 20,
				max_uses: 100,
				current_uses: 0,
				valid_from: new Date('2026-01-01'),
				valid_until: new Date('2026-12-31'),
				status: 'activo',
				created_at: new Date('2026-01-01'),
			},
			{
				coupon_id: 'coup-2',
				code: 'EXPIRED5',
				discount_type: 'fixed',
				discount_value: 5,
				min_purchase: null,
				max_uses: null,
				current_uses: 5,
				valid_from: new Date('2025-01-01'),
				valid_until: new Date('2025-12-31'),
				status: 'activo',
				created_at: new Date('2025-01-01'),
			},
			{
				coupon_id: 'coup-3',
				code: 'INACTIVE',
				discount_type: 'fixed',
				discount_value: 15,
				min_purchase: null,
				max_uses: null,
				current_uses: 1,
				valid_from: null,
				valid_until: null,
				status: 'inactivo',
				created_at: new Date('2026-01-02'),
			},
		]
	})

	it('listCoupons returns all coupons when onlyUsable is false', async () => {
		const repo = buildCouponsRepo()
		const list = await listCoupons({ coupons: repo }, { onlyUsable: false })
		assert.equal(list.length, 3)
	})

	it('listCoupons filters redeemable coupons when onlyUsable is true', async () => {
		const repo = buildCouponsRepo()
		const now = new Date('2026-06-01')
		const list = await listCoupons({ coupons: repo }, { onlyUsable: true, now })
		assert.equal(list.length, 1)
		assert.equal(list[0].code, 'WELCOME10')
	})

	it('createCoupon creates a new coupon successfully', async () => {
		const repo = buildCouponsRepo()
		const created = await createCoupon(
			{ coupons: repo },
			{
				code: 'SUMMER20',
				discount_type: 'percentage',
				discount_value: 20,
				status: 'activo',
			},
		)
		assert.equal(created.code, 'SUMMER20')
		assert.equal(created.discount_value, 20)
		assert.equal(couponsStore.length, 4)
	})

	it('createCoupon throws 409 if coupon code already exists', async () => {
		const repo = buildCouponsRepo()
		await assert.rejects(
			async () => {
				await createCoupon(
					{ coupons: repo },
					{
						code: 'WELCOME10',
						discount_type: 'percentage',
						discount_value: 10,
					},
				)
			},
			(err: any) => err.statusCode === 409 && err.statusMessage.includes('Ya existe un cupón'),
		)
	})

	it('updateCoupon modifies an existing coupon and respects business rules', async () => {
		const repo = buildCouponsRepo()
		const updated = await updateCoupon(
			{ coupons: repo },
			{
				id: 'coup-1',
				data: { discount_value: 15 },
			},
		)
		assert.equal(updated.discount_value, 15)
	})

	it('updateCoupon rejects percentage > 100%', async () => {
		const repo = buildCouponsRepo()
		await assert.rejects(
			async () => {
				await updateCoupon(
					{ coupons: repo },
					{
						id: 'coup-1',
						data: { discount_value: 150 },
					},
				)
			},
			(err: any) => err.statusCode === 400 && err.statusMessage.includes('100%'),
		)
	})

	it('updateCoupon throws 404 for nonexistent coupon', async () => {
		const repo = buildCouponsRepo()
		await assert.rejects(
			async () => {
				await updateCoupon(
					{ coupons: repo },
					{
						id: 'non-existent',
						data: { discount_value: 5 },
					},
				)
			},
			(err: any) => err.statusCode === 404,
		)
	})

	it('deleteCoupon deletes unused coupon completely', async () => {
		const repo = buildCouponsRepo()
		const result = await deleteCoupon({ coupons: repo }, { id: 'coup-1' })
		assert.deepEqual(result, { success: true, deleted: true, deactivated: false })
		assert.equal(couponsStore.some(c => c.coupon_id === 'coup-1'), false)
	})

	it('deleteCoupon deactivates used coupon instead of deleting', async () => {
		const repo = buildCouponsRepo()
		const result = await deleteCoupon({ coupons: repo }, { id: 'coup-2' })
		assert.deepEqual(result, { success: true, deleted: false, deactivated: true })
		assert.equal(couponsStore.find(c => c.coupon_id === 'coup-2')?.status, 'inactivo')
	})
})

