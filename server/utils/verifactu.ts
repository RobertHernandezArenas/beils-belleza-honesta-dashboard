import crypto from 'node:crypto'
import { prisma } from './prisma'

// ------------------------------------------------------------------
// AEAT VERI*FACTU CONSTANTS
// ------------------------------------------------------------------
const PREFIX = 'BBH'
const HASH_ALGORITHM = 'sha256'

/**
 * 1. Generate the next consecutive invoice number atomically.
 * Example: BBH-2025-0001
 */
export async function generateInvoiceNumber(
	type: 'F1' | 'F2' = 'F2',
	year: number = new Date().getFullYear(),
): Promise<string> {
	const seqType = `invoice_${year}`

	// UPSERT: Create if not exists, otherwise increment last_value by 1
	const sequence = await prisma.sequence.upsert({
		where: { type: seqType },
		update: {
			last_value: { increment: 1 },
		},
		create: {
			type: seqType,
			prefix: PREFIX,
			year: year,
			last_value: 1,
		},
	})

	// Pad with leading zeros (e.g., 0001, 0002)
	const paddedValue = sequence.last_value.toString().padStart(4, '0')
	const invoiceNumber = `${PREFIX}-${year}-${paddedValue}`

	return invoiceNumber
}

/**
 * 2. Generate Invoice Hash following Veri*Factu specifications (simplified for this context)
 * Hash(Issuer NIF + Invoice Number + Date + Type + Total + Previous Hash)
 */
export function generateInvoiceHash(
	nif: string,
	invoiceNumber: string,
	date: Date,
	invoiceType: string,
	total: number,
	previousHash: string | null = null,
): string {
	const isoString = date.toISOString()
	const datePart = isoString.split('T')[0]
	const formattedDate = datePart ? datePart.replace(/-/g, '') : '19700101'
	// Basic AEAT string structure (simplified logic based on typical specs)
	const baseString = `${nif}|${invoiceNumber}|${formattedDate}|${invoiceType}|${total.toFixed(2)}`

	// Concatenate previous hash if it exists (Chaining)
	const finalString = previousHash ? `${baseString}|${previousHash}` : baseString

	return crypto.createHash(HASH_ALGORITHM).update(finalString).digest('hex').toUpperCase()
}

/**
 * 3. Generate QR Content
 * Spec requires URL encoding of invoice info allowing easy validation
 */
export function generateQRData(nif: string, invoiceNumber: string, total: number, hash: string): string {
	// Example format for the AEAT verification URL (Veri*Factu spec)
	const baseUrl = 'https://www2.agenciatributaria.gob.es/wlpl/inwinv/es.aeat.dit.adu.sinc.PREV?QR='
	const payload = `ID=${nif}&NUM=${invoiceNumber}&TOT=${total.toFixed(2)}&HASH=${hash.substring(0, 10)}`

	return `${baseUrl}${encodeURIComponent(payload)}`
}

/**
 * 4. Submit to AEAT (Mockup)
 * In a real environment, this builds the XML (FacturaE format) and signs it
 * with a valid digital certificate before SOAP transmission.
 */
export async function submitToAEAT(invoiceData: any): Promise<{ status: string; message: string }> {
	// Simulate API Delay
	await new Promise(resolve => setTimeout(resolve, 800))

	// In a sandbox, we return success assuming Verifactu checks passed.
	return {
		status: 'submitted',
		message: 'Successfully submitted and verified by AEAT.',
	}
}
