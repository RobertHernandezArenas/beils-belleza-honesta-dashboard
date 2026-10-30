import type { IInvoice } from '../../../shared/types/invoice'

/**
 * Invoice issuing shared by the use cases that complete a cart. It runs AFTER the sale
 * transaction commits: a Verifactu/AEAT failure never rolls a sale back, it only leaves
 * the cart flagged with aeat_status 'error'.
 */

export type InvoiceType = 'F1' | 'I'

export interface VerifactuGateway {
	generateInvoiceNumber(type: InvoiceType): Promise<string>
	submit(invoice: IInvoice): Promise<{ hash: string; qrUrl: string; aeatStatus: string }>
}

export interface CartInvoiceStore {
	saveInvoice(cartId: string, data: {
		invoice_number: string
		invoice_type: InvoiceType
		qr_content: string
		hash: string
		aeat_status: string
	}): Promise<unknown>
	markInvoiceError(cartId: string): Promise<unknown>
}

export interface InvoicingDeps {
	verifactu: VerifactuGateway
	issuer: { nif: string; name: string }
	now: () => Date
}

export async function invoiceCart(
	deps: InvoicingDeps & { store: CartInvoiceStore },
	cart: { cart_id: string; total: number },
	resolveInvoiceType: () => Promise<InvoiceType>,
	failureLabel: string,
) {
	try {
		const invoiceType = await resolveInvoiceType()
		const invoiceNumber = await deps.verifactu.generateInvoiceNumber(invoiceType)

		const { hash, qrUrl, aeatStatus } = await deps.verifactu.submit({
			id: cart.cart_id,
			invoiceNumber,
			issueDate: deps.now().toISOString(),
			issuer: deps.issuer,
			totalAmount: cart.total,
		})

		await deps.store.saveInvoice(cart.cart_id, {
			invoice_number: invoiceNumber,
			invoice_type: invoiceType,
			qr_content: qrUrl,
			hash,
			aeat_status: aeatStatus,
		})
	} catch (vError) {
		console.error(failureLabel, vError)
		await deps.store.markInvoiceError(cart.cart_id).catch(() => {})
	}
}
