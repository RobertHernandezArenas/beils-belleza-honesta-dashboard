/**
 * Cart-level discount math shared by the server (authoritative totals) and the browser
 * (TPV preview, tickets, invoices). Pure: no imports, so both sides and the tests can use it.
 *
 * Order: the coupon applies to the subtotal first, the manual discount to what remains.
 * Prices are VAT-inclusive, so a discount lowers the gross; the invoice prorates it per VAT rate.
 */

export type DiscountKind = 'fixed' | 'percentage'

export interface DiscountRule {
	type: DiscountKind
	value: number
}

export interface SaleDiscountBreakdown {
	subtotal: number
	couponAmount: number
	manualAmount: number
	totalDiscount: number
	total: number
}

/** Discount fields stored on a cart. Old carts only have `discount` (a fixed € amount). */
export interface CartDiscountSnapshot {
	discount: number
	coupon_code?: string | null
	coupon_discount_type?: string | null
	coupon_discount_value?: number | null
	coupon_discount_amount?: number | null
	manual_discount_type?: string | null
	manual_discount_value?: number | null
	manual_discount_amount?: number | null
}

export interface TaxBreakdownRow {
	rate: number
	gross: number
	discount: number
	net: number
	base: number
	vat: number
}

/** Half-up to cents (toFixed alone misrounds e.g. 15.555 -> 15.55). */
const roundCents = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100

/** Accepts the legacy 'fixed_amount' spelling used by older coupon rows. */
export function normalizeDiscountKind(type: unknown): DiscountKind | null {
	if (type === 'percentage') return 'percentage'
	if (type === 'fixed' || type === 'fixed_amount') return 'fixed'
	return null
}

/** What a rule takes off `base`, capped at `base`. */
function ruleAmount(rule: DiscountRule | null | undefined, base: number) {
	if (!rule || base <= 0 || !(rule.value > 0)) return 0
	const raw = rule.type === 'percentage' ? (base * Math.min(rule.value, 100)) / 100 : rule.value
	return Math.min(roundCents(raw), base)
}

export function computeSaleDiscounts(
	subtotal: number,
	{ coupon, manual }: { coupon?: DiscountRule | null; manual?: DiscountRule | null },
): SaleDiscountBreakdown {
	const base = roundCents(Math.max(0, subtotal))
	const couponAmount = ruleAmount(coupon, base)
	const manualAmount = ruleAmount(manual, roundCents(base - couponAmount))
	const totalDiscount = roundCents(couponAmount + manualAmount)
	return { subtotal: base, couponAmount, manualAmount, totalDiscount, total: roundCents(base - totalDiscount) }
}

export function couponRuleOf(cart: CartDiscountSnapshot): DiscountRule | null {
	const type = normalizeDiscountKind(cart.coupon_discount_type)
	if (!cart.coupon_code || !type || cart.coupon_discount_value == null) return null
	return { type, value: cart.coupon_discount_value }
}

export function manualRuleOf(cart: CartDiscountSnapshot): DiscountRule | null {
	const type = normalizeDiscountKind(cart.manual_discount_type)
	if (type) return cart.manual_discount_value ? { type, value: cart.manual_discount_value } : null
	// Carts created before the snapshot existed: `discount` was a fixed manual amount
	if (!cart.coupon_code && cart.discount > 0) return { type: 'fixed', value: cart.discount }
	return null
}

const formatEs = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(2).replace('.', ','))

const formatRule = (rule: DiscountRule) => (rule.type === 'percentage' ? `−${formatEs(rule.value)}%` : `−${formatEs(rule.value)} €`)

/** Printable discount lines for tickets/invoices (Spanish, like the rest of the print helpers). */
export function describeSaleDiscounts(cart: CartDiscountSnapshot): { label: string; amount: number }[] {
	const lines: { label: string; amount: number }[] = []
	const coupon = couponRuleOf(cart)
	const hasManualSnapshot = !!normalizeDiscountKind(cart.manual_discount_type)

	// Shown even at 0,00 € so the sale keeps the trace of the coupon it used
	if (coupon) {
		lines.push({ label: `Cupón ${cart.coupon_code} (${formatRule(coupon)})`, amount: cart.coupon_discount_amount ?? 0 })
	}
	if (hasManualSnapshot) {
		const manual = manualRuleOf(cart)
		if (manual && cart.manual_discount_amount) {
			lines.push({ label: `Descuento (${formatRule(manual)})`, amount: cart.manual_discount_amount })
		}
	} else if (!cart.coupon_code && cart.discount > 0) {
		lines.push({ label: 'Descuento', amount: cart.discount })
	}
	return lines
}

/**
 * VAT breakdown after a cart-level discount: the discount is split across VAT rates in
 * proportion to each rate's gross, so every taxable base and VAT amount reflects it. The
 * rounding residue goes to the largest rate, so the nets always add up to gross - discount.
 */
export function prorateDiscountByTaxRate(lines: { tax_rate: number | null; total: number }[], discount: number): TaxBreakdownRow[] {
	const grossByRate = new Map<number, number>()
	for (const line of lines) {
		const rate = line.tax_rate || 0
		grossByRate.set(rate, (grossByRate.get(rate) || 0) + line.total)
	}

	const groups = [...grossByRate.entries()]
		.map(([rate, gross]) => ({ rate, gross: roundCents(gross) }))
		.filter(g => g.gross > 0)
		.sort((a, b) => a.rate - b.rate)
	if (groups.length === 0) return []

	const totalGross = roundCents(groups.reduce((acc, g) => acc + g.gross, 0))
	const toSpread = Math.min(Math.max(0, roundCents(discount || 0)), totalGross)
	const largest = groups.reduce((best, g) => (g.gross > best.gross ? g : best), groups[0]!)

	const shares = new Map(groups.map(g => [g, g === largest ? 0 : roundCents((toSpread * g.gross) / totalGross)]))
	const othersShare = roundCents([...shares.values()].reduce((acc, s) => acc + s, 0))
	shares.set(largest, Math.min(largest.gross, roundCents(toSpread - othersShare)))

	return groups.map(g => {
		const share = shares.get(g) || 0
		const net = roundCents(g.gross - share)
		const base = roundCents(net / (1 + g.rate / 100))
		return { rate: g.rate, gross: g.gross, discount: share, net, base, vat: roundCents(net - base) }
	})
}
