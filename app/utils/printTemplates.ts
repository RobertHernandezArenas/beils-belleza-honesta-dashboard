import type { Debt, Sale, SaleItem } from '../../shared/types/domain'
import { describeSaleDiscounts, prorateDiscountByTaxRate } from '../../shared/utils/discounts'
import {
	buildDebtReceipt,
	describePayment,
	formatEuro,
	paymentMethodLabel,
	paymentStatusLabel,
	salePaymentStatus,
} from '../../shared/utils/payments'

/** Business data printed on every document (comes from public runtime config). */
export interface SalonInfo {
	name: string
	nif: string
	address: string
	phone: string
}

const esc = (value: unknown) =>
	String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!)

const PENDING_INVOICE = 'Pendiente de factura'

const ticketStyles = `
          body { font-family: 'Courier New', monospace; padding: 20px; font-size: 12px; max-width: 320px; margin: auto; color: #000; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .divider { border-bottom: 1px dashed #000; margin: 10px 0; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          th, td { padding: 4px 0; }
          th { border-bottom: 1px solid #000; text-align: center; }`

const ticketHeader = (salon: SalonInfo) => `
        <div class="center bold" style="font-size: 16px;">${esc(salon.name)}</div>
        <div class="center">CIF: ${esc(salon.nif)}</div>
        ${salon.address ? `<div class="center">${esc(salon.address)}</div>` : ''}
        ${salon.phone ? `<div class="center">Tel: ${esc(salon.phone)}</div>` : ''}`

const ticketItemsHtml = (items: SaleItem[] | undefined, emptyText: string) =>
	items?.length
		? items
				.map(
					item => `
    <tr>
      <td style="text-align: left;">${esc(item.name)} <br><small style="color:#666">IVA aplicado: ${item.tax_rate}%</small></td>
      <td style="text-align: center;">${item.quantity}</td>
      <td style="text-align: right;">${item.total.toFixed(2)}€</td>
    </tr>`,
				)
				.join('')
		: `<tr><td colspan="3">${emptyText}</td></tr>`

/** Debt payments of a sale in date order, with the totals the invoice and ticket print. */
const paymentHistory = (cart: Sale) => {
	const status = salePaymentStatus(cart)
	if (!status) return null
	const payments = (cart.debts ?? [])
		.flatMap(d => d.payments ?? [])
		.sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime())
	return { status, payments }
}

/** Thermal ticket of a sale. */
export function buildReceiptHtml(cart: Sale, salon: SalonInfo): string {
	const dateStr = new Date(cart.created_at).toLocaleString()
	const history = paymentHistory(cart)
	const discountLines = describeSaleDiscounts(cart)
	const discountRowsHtml =
		discountLines.length > 0
			? `
          <tr>
            <td>Subtotal:</td>
            <td style="text-align:right;">${cart.subtotal.toFixed(2)}€</td>
          </tr>
          ${discountLines
						.map(
							line => `
          <tr>
            <td>${esc(line.label)}</td>
            <td style="text-align:right;">-${line.amount.toFixed(2)}€</td>
          </tr>`,
						)
						.join('')}`
			: ''

	const statusRowsHtml = history
		? `
          <tr>
            <td>Estado del pago:</td>
            <td style="text-align:right;">${esc(paymentStatusLabel(history.status))}</td>
          </tr>
          <tr>
            <td>Cobrado:</td>
            <td style="text-align:right;">${formatEuro(history.status.paid)}</td>
          </tr>
          <tr>
            <td>Pendiente:</td>
            <td style="text-align:right;">${formatEuro(history.status.remaining)}</td>
          </tr>`
		: ''

	return `
    <html>
      <head>
        <title>Ticket de Compra</title>
        <style>${ticketStyles}
        </style>
      </head>
      <body>${ticketHeader(salon)}
        <div class="divider"></div>
        <div class="center bold">TICKET DE COMPRA</div>
        <div class="divider"></div>
        <div><strong>Fecha:</strong> ${dateStr}</div>
        <div><strong>Factura:</strong> ${esc(cart.invoice_number || PENDING_INVOICE)}</div>
        <div class="divider"></div>

        <div class="bold">Conceptos de Compra:</div>
        <table>
          <thead>
            <tr>
              <th style="text-align:left;">Concepto</th>
              <th>Cant.</th>
              <th style="text-align:right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${ticketItemsHtml(cart.items, 'Venta sin ticket detallado')}
          </tbody>
        </table>

        <div class="divider"></div>
        <table>
          ${discountRowsHtml}
          <tr class="bold" style="font-size: 14px;">
            <td>${history ? 'TOTAL:' : 'TOTAL PAGADO:'}</td>
            <td style="text-align:right;">${cart.total.toFixed(2)}€</td>
          </tr>
          <tr>
            <td>Método de Cobro:</td>
            <td style="text-align:right;">${esc(cart.payment_method === 'mixed' ? describePayment('mixed', cart.payment_breakdown) : paymentMethodLabel(cart.payment_method).toUpperCase())}</td>
          </tr>
          ${statusRowsHtml}
        </table>
        <div class="divider"></div>
        <div class="center">
          <p>${history ? 'Compra facturada. Pago aplazado.' : 'Compra facturada y pagada correctamente.'}</p>
          <p>¡Gracias por confiar en nosotros!</p>
        </div>
      </body>
    </html>
  `
}

/** A4 invoice of a sale, with the payment history when it was (or is being) paid in installments. */
export function buildInvoiceHtml(cart: Sale, salon: SalonInfo): string {
	const dateStr = new Date(cart.created_at).toLocaleString()

	// Base Imponible by Tax Rate, after spreading the cart discount across the rates (prices include VAT)
	const taxes = prorateDiscountByTaxRate(cart.items || [], cart.discount || 0)
	const totalBase = taxes.reduce((acc, row) => acc + row.base, 0)
	const discountLines = describeSaleDiscounts(cart)
	const history = paymentHistory(cart)

	const itemsHtml =
		cart.items
			?.map((item: SaleItem) => {
				const rate = item.tax_rate || 0
				const itemUnitPriceBase = item.unit_price / (1 + rate / 100)
				return `
    <tr style="border-bottom: 1px solid #eee;">
      <td style="padding: 10px 0; text-align: left;">
        <strong>${esc(item.name)}</strong><br>
        <span style="color:#666; font-size:11px;">${esc(item.item_type || 'Concepto')}</span>
      </td>
      <td style="padding: 10px 0; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px 0; text-align: right;">${itemUnitPriceBase.toFixed(2)}€</td>
      <td style="padding: 10px 0; text-align: center;">${rate}%</td>
      <td style="padding: 10px 0; text-align: right;">${item.total.toFixed(2)}€</td>
    </tr>
  `
			})
			.join('') || `<tr><td colspan="5">Factura sin detalles</td></tr>`

	const taxRowsHtml = taxes
		.map(
			row => `
      <tr style="font-size: 12px; color: #555;">
        <td style="padding: 4px 0;">IVA al ${row.rate}% sobre ${row.base.toFixed(2)}€:</td>
        <td style="text-align:right;">${row.vat.toFixed(2)}€</td>
      </tr>
    `,
		)
		.join('')

	const discountRowsHtml =
		discountLines.length > 0
			? `
            <tr>
              <td>Subtotal (IVA incl.):</td>
              <td style="text-align:right;">${cart.subtotal.toFixed(2)}€</td>
            </tr>
            ${discountLines.map(line => `<tr><td style="color: red;">${esc(line.label)}:</td><td style="text-align:right; color:red;">-${line.amount.toFixed(2)}€</td></tr>`).join('')}`
			: ''

	const clientName = cart.user ? `${esc(cart.user.name)} ${esc(cart.user.surname)}` : 'Cliente Mostrador'
	const clientDoc = cart.user?.document_number ? `<br>NIF/NIE: ${esc(cart.user.document_number)}` : ''
	const clientEmail = cart.user?.email ? `<br>Email: ${esc(cart.user.email)}` : ''

	const invoiceNumber = cart.invoice_number || PENDING_INVOICE
	const invoiceTitle =
		cart.invoice_type === 'F1' ? 'FACTURA' : cart.invoice_type === 'F2' ? 'FACTURA SIMPLIFICADA' : 'FACTURA / TICKET'

	const historyHtml = history
		? `
        <div class="box" style="width: auto; margin-bottom: 30px;">
          <div class="box-title">Historial de pagos</div>
          <div style="margin-bottom: 6px;"><strong>${history.payments.length} ${history.payments.length === 1 ? 'pago' : 'pagos'}</strong></div>
          ${
						history.payments.length > 0
							? `<table style="margin-bottom: 10px;">
            ${history.payments
							.map(
								p => `<tr>
              <td style="padding: 3px 0;">${new Date(p.payment_date).toLocaleDateString('es-ES')}</td>
              <td style="padding: 3px 0;">${esc(describePayment(p.payment_method, p.payment_breakdown))}</td>
              <td style="padding: 3px 0; text-align: right;">${formatEuro(p.amount)}</td>
            </tr>`,
							)
							.join('')}
          </table>`
							: ''
					}
          <div>Total cobrado: <strong>${formatEuro(history.status.paid)}</strong></div>
          <div>${history.status.state === 'paid' ? '<strong>Pagada</strong>' : `Pendiente: <strong>${formatEuro(history.status.remaining)}</strong>`}</div>
        </div>`
		: ''

	return `
    <html>
      <head>
        <title>Factura ${esc(invoiceNumber)}</title>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; max-width: 800px; margin: auto; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid #000; padding-bottom: 20px;}
          .title { font-size: 24px; font-weight: bold; margin: 0; }
          .subtitle { color: #666; font-size: 14px; margin-top: 5px; }
          .info-block { display: flex; justify-content: space-between; margin-bottom: 30px; font-size: 14px; line-height: 1.5; }
          .box { background: #f9fafb; padding: 15px; border-radius: 8px; width: 45%; border: 1px solid #e5e7eb;}
          .box-title { font-weight: bold; font-size: 12px; text-transform: uppercase; color: #6b7280; margin-bottom: 5px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th { border-bottom: 2px solid #e5e7eb; text-align: left; padding: 12px 0; color: #6b7280; font-size: 12px; text-transform: uppercase; }
          .totals { width: 100%; display: flex; justify-content: flex-end; }
          .totals-table { width: 350px; }
          .totals-table td { padding: 8px 0; }
          .grand-total { font-size: 18px; font-weight: bold; border-top: 2px solid #000; padding-top: 10px; margin-top: 10px; }
          .footer { margin-top: 50px; text-align: center; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">${esc(salon.name)}</h1>
            <div class="subtitle">CIF: ${esc(salon.nif)}${salon.address ? `<br>${esc(salon.address)}` : ''}${salon.phone ? `<br>Tel: ${esc(salon.phone)}` : ''}</div>
          </div>
          <div style="text-align: right;">
            <h2 style="margin:0; font-size: 20px; color: #111;">${invoiceTitle}</h2>
            <div style="font-size: 16px; font-weight: bold; color: #4b5563; margin-top: 5px;">${esc(invoiceNumber)}</div>
            <div style="color: #6b7280; margin-top: 5px;">Fecha: ${dateStr}</div>
          </div>
        </div>

        <div class="info-block">
          <div class="box">
            <div class="box-title">Datos del Cliente</div>
            <strong>${clientName}</strong>
            ${clientDoc}
            ${clientEmail}
          </div>
          <div class="box" style="display:flex; flex-direction: column; justify-content:center;">
             <div class="box-title">Datos de Pago</div>
             <div><strong>Método:</strong> ${esc(describePayment(cart.payment_method, cart.payment_breakdown))}</div>
             <div><strong>Estado:</strong> ${history ? esc(paymentStatusLabel(history.status)) : 'Pagado'}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Concepto</th>
              <th style="text-align: center;">Cant.</th>
              <th style="text-align: right;">Precio Ud. (Base)</th>
              <th style="text-align: center;">% IVA</th>
              <th style="text-align: right;">Subtotal (IVA incl.)</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="totals">
          <table class="totals-table">
            ${discountRowsHtml}
            <tr>
              <td>Base Imponible Acumul.:</td>
              <td style="text-align:right;">${totalBase.toFixed(2)}€</td>
            </tr>
            ${taxRowsHtml}
            <tr class="grand-total">
              <td>TOTAL FACTURA:</td>
              <td style="text-align:right;">${cart.total.toFixed(2)}€</td>
            </tr>
          </table>
        </div>
        ${historyHtml}
        <div class="footer">
          Documento expedido y validado a través de Beils Finanzas.<br>
          Gracias por su visita.
        </div>
      </body>
    </html>
  `
}

export interface DebtReceiptInput {
	debt: Pick<Debt, 'amount' | 'payments'>
	paymentId: string
	/** Invoice of the sold ticket; null for a legacy sale not invoiced yet. */
	invoiceNumber: string | null | undefined
	clientName: string
	items?: SaleItem[]
	/** A debt that was typed in by hand, with no sale behind it. */
	manualDebt?: boolean
}

/** Thermal "ticket de cobro" for one debt payment; null when the payment is not part of the debt. */
export function buildDebtReceiptHtml(input: DebtReceiptInput, salon: SalonInfo): string | null {
	const receipt = buildDebtReceipt(
		{ amount: input.debt.amount, payments: input.debt.payments ?? [] },
		input.paymentId,
	)
	if (!receipt) return null
	const { payment } = receipt
	const reference = input.manualDebt ? 'Deuda manual' : input.invoiceNumber || PENDING_INVOICE

	return `
    <html>
      <head>
        <title>Ticket de Cobro</title>
        <style>${ticketStyles}
        </style>
      </head>
      <body>${ticketHeader(salon)}
        <div class="divider"></div>
        <div class="center bold">TICKET DE COBRO</div>
        <div class="divider"></div>
        <div><strong>Fecha:</strong> ${new Date(payment.payment_date).toLocaleString()}</div>
        <div><strong>Factura:</strong> ${esc(reference)}</div>
        ${input.clientName ? `<div><strong>Cliente:</strong> ${esc(input.clientName)}</div>` : ''}
        <div class="divider"></div>
        ${
					input.items?.length
						? `<div class="bold">Conceptos de la venta:</div>
        <table>
          <thead>
            <tr>
              <th style="text-align:left;">Concepto</th>
              <th>Cant.</th>
              <th style="text-align:right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${ticketItemsHtml(input.items, '')}
          </tbody>
        </table>
        <div class="divider"></div>`
						: ''
				}
        <table>
          <tr class="bold" style="font-size: 14px;">
            <td>IMPORTE RECIBIDO:</td>
            <td style="text-align:right;">${formatEuro(payment.amount)}</td>
          </tr>
          <tr>
            <td>Método de Pago:</td>
            <td style="text-align:right;">${esc(describePayment(payment.payment_method, payment.payment_breakdown))}</td>
          </tr>
          <tr>
            <td>Pago:</td>
            <td style="text-align:right;">Pago ${receipt.number} de ${receipt.total}</td>
          </tr>
          <tr>
            <td>Total pagado hasta ahora:</td>
            <td style="text-align:right;">${formatEuro(receipt.paidSoFar)}</td>
          </tr>
          <tr class="bold">
            <td>Pendiente:</td>
            <td style="text-align:right;">${formatEuro(receipt.remaining)}</td>
          </tr>
        </table>
        <div class="divider"></div>
        <div class="center">
          <p>¡Gracias por confiar en nosotros!</p>
        </div>
      </body>
    </html>
  `
}
