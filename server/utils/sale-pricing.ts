import { createError } from 'h3'
import { z } from 'zod'
import { parseOrBadRequest } from './validation'

/**
 * Server-side sale pricing: the browser says WHAT is sold and HOW MANY; the price and tax
 * always come from the catalog. Prevents tampered/negative prices turning into invoices.
 */

const SALE_ITEM_TYPES = ['product', 'service', 'package_sale', 'package'] as const

const saleLine = z.object({
	item_id: z.string().min(1).max(100),
	item_type: z.enum(SALE_ITEM_TYPES, { message: 'Tipo de línea de venta no válido' }),
	name: z.string().trim().min(1).max(150),
	quantity: z.number().int('La cantidad debe ser un número entero').min(1, 'La cantidad debe ser al menos 1').max(999),
})

const saleLines = z.array(saleLine, { message: 'Líneas de venta no válidas' }).min(1, 'La venta no tiene líneas').max(200)

export type SaleLineInput = z.infer<typeof saleLine>

export interface SaleCatalog {
	products: Map<string, { price: number; tax_rate: number }>
	services: Map<string, { price: number; tax_rate: number }>
	packages: Map<string, { price: number }>
}

const DEFAULT_TAX_RATE = 21

/** Round money half-up to cents (toFixed alone misrounds e.g. 15.555 -> 15.55). */
const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100

/** Validates line shape; client-sent unit_price / tax_rate are dropped. */
export const parseSaleLines = (items: unknown): SaleLineInput[] => parseOrBadRequest(saleLines, items)

export function priceSaleLines(lines: SaleLineInput[], catalog: SaleCatalog) {
	return lines.map(line => {
		const notFound = () =>
			createError({ statusCode: 400, statusMessage: `"${line.name}" ya no existe en el catálogo` })

		switch (line.item_type) {
			case 'product': {
				const item = catalog.products.get(line.item_id)
				if (!item) throw notFound()
				return { ...line, unit_price: item.price, tax_rate: item.tax_rate }
			}
			case 'service': {
				const item = catalog.services.get(line.item_id)
				if (!item) throw notFound()
				return { ...line, unit_price: item.price, tax_rate: item.tax_rate }
			}
			case 'package_sale': {
				const item = catalog.packages.get(line.item_id)
				if (!item) throw notFound()
				return { ...line, unit_price: item.price, tax_rate: DEFAULT_TAX_RATE }
			}
			case 'package':
				// Bono session: paid when the bono was sold; consumption is handled separately
				return { ...line, unit_price: 0, tax_rate: DEFAULT_TAX_RATE }
		}
	})
}

export function validateDiscount(discount: unknown, subtotal: number) {
	if (discount === undefined || discount === null) return 0
	if (typeof discount !== 'number' || !Number.isFinite(discount) || discount < 0) {
		throw createError({ statusCode: 400, statusMessage: 'Descuento no válido' })
	}
	const rounded = round2(discount)
	if (rounded > subtotal) {
		throw createError({ statusCode: 400, statusMessage: 'El descuento no puede superar el subtotal' })
	}
	return rounded
}

export const saleSubtotal = (lines: { unit_price: number; quantity: number }[]) =>
	round2(lines.reduce((acc, l) => acc + l.unit_price * l.quantity, 0))

interface CatalogDb {
	product: { findMany(args: unknown): Promise<{ product_id: string; price: number; tax_rate: number }[]> }
	service: { findMany(args: unknown): Promise<{ service_id: string; price: number; tax_rate: number }[]> }
	package: { findMany(args: unknown): Promise<{ package_id: string; price: number }[]> }
}

/** Loads only the catalog rows referenced by the sale. */
export async function loadSaleCatalog(db: unknown, lines: SaleLineInput[]): Promise<SaleCatalog> {
	const prismaDb = db as CatalogDb
	const idsOf = (type: SaleLineInput['item_type']) => [...new Set(lines.filter(l => l.item_type === type).map(l => l.item_id))]
	const [products, services, packages] = await Promise.all([
		prismaDb.product.findMany({ where: { product_id: { in: idsOf('product') } }, select: { product_id: true, price: true, tax_rate: true } }),
		prismaDb.service.findMany({ where: { service_id: { in: idsOf('service') } }, select: { service_id: true, price: true, tax_rate: true } }),
		prismaDb.package.findMany({ where: { package_id: { in: idsOf('package_sale') } }, select: { package_id: true, price: true } }),
	])
	return {
		products: new Map(products.map(p => [p.product_id, { price: p.price, tax_rate: p.tax_rate }])),
		services: new Map(services.map(s => [s.service_id, { price: s.price, tax_rate: s.tax_rate }])),
		packages: new Map(packages.map(p => [p.package_id, { price: p.price }])),
	}
}
