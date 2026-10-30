import type { Sale } from '~~/shared/types/domain'
import {
	buildReceiptHtml,
	buildInvoiceHtml,
	buildDebtReceiptHtml,
	type DebtReceiptInput,
	type SalonInfo,
} from './printTemplates'

// Business data comes from the public runtime config (it is printed on every document anyway)
const salonInfo = (): SalonInfo => {
	const config = useRuntimeConfig().public
	return {
		name: String(config.salonName || ''),
		nif: String(config.salonNif || ''),
		address: String(config.salonAddress || ''),
		phone: String(config.salonPhone || ''),
	}
}

const printHtml = (html: string) => {
	const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
	if (isMobile) {
		const printWin = window.open('', '_blank')
		if (printWin) {
			printWin.document.open()
			printWin.document.write(html)
			printWin.document.close()
			printWin.focus()
			setTimeout(() => {
				printWin.print()
			}, 500)
			return
		}
	}

	const iframe = document.createElement('iframe')
	iframe.style.display = 'none'
	document.body.appendChild(iframe)
	const doc = iframe.contentWindow?.document
	if (!doc) return
	doc.open()
	doc.write(html)
	doc.close()
	setTimeout(() => {
		iframe.contentWindow?.focus()
		iframe.contentWindow?.print()
		setTimeout(() => {
			document.body.removeChild(iframe)
		}, 1000)
	}, 250)
}

export const printReceipt = (cart: Sale) => {
	if (!cart) return
	printHtml(buildReceiptHtml(cart, salonInfo()))
}

export const printInvoice = (cart: Sale) => {
	if (!cart) return
	printHtml(buildInvoiceHtml(cart, salonInfo()))
}

/** Receipt (ticket de cobro) of one debt payment. */
export const printDebtPaymentReceipt = (input: DebtReceiptInput) => {
	const html = buildDebtReceiptHtml(input, salonInfo())
	if (html) printHtml(html)
}
