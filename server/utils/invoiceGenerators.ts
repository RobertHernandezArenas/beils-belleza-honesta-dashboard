import { createHash } from 'node:crypto'
import type { IInvoice } from '~~/shared/types/invoice'

/**
 * Generates a SHA-256 hash for an invoice, chained to the previous one if available.
 * Follows the concatenation rule: NIF_Emisor + NumSerieFactura + FechaExpedicion + TipoFactura + ImporteTotal + HuellaFacturaAnterior
 */
export const generateInvoiceHash = (invoice: IInvoice, previousHash?: string | null): string => {
	// Normalization: strip spaces and separators if any (though here we expect clean data)
	// Format date as DD-MM-YYYY or similar per spec if needed, but chaining usually uses raw fields
	// According to PDF: NIF + NumSerie + Fecha + Tipo + Importe + HashAnterior
	
	const formattedAmount = invoice.totalAmount.toFixed(2)
	
	// PDF Example Concatenation:
	// ${invoice.issuer.nif}${invoice.invoiceNumber}${invoice.issueDate}${formattedAmount}
	// Note: The PDF mentions ISO 8601 or similar. We'll use the provided issueDate string.
	
	const rawData = `${invoice.issuer.nif}${invoice.invoiceNumber}${invoice.issueDate}${formattedAmount}`
	
	const chainedData = previousHash 
		? `${rawData}${previousHash.substring(0, 64)}` 
		: rawData

	return createHash('sha256')
		.update(chainedData, 'utf8')
		.digest('hex')
		.toUpperCase()
}

/**
 * Generates the official AEAT verification URL for the QR code.
 */
export const generateQrUrl = (invoice: IInvoice): string => {
	const config = useRuntimeConfig()
	const baseUrl = config.public.aeatQrBaseUrl || 'https://prewww2.aeat.es/wlpl/TIKE-CONT/ValidarQR'
	
	// Format date for QR: DD-MM-YYYY
	const dateObj = new Date(invoice.issueDate)
	const day = String(dateObj.getDate()).padStart(2, '0')
	const month = String(dateObj.getMonth() + 1).padStart(2, '0')
	const year = dateObj.getFullYear()
	const formattedDate = `${day}-${month}-${year}`

	const params = new URLSearchParams({
		nif: invoice.issuer.nif,
		numserie: invoice.invoiceNumber,
		fecha: formattedDate,
		importe: invoice.totalAmount.toFixed(2)
	})

	return `${baseUrl}?${params.toString()}`
}
