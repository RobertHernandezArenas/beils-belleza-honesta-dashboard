import { prisma } from './prisma'
import { generateInvoiceHash, generateQrUrl } from './invoiceGenerators'
import { submitToAeat } from './aeatSoapClient'
import type { IInvoice } from '~~/shared/types/invoice'

// ------------------------------------------------------------------
// AEAT VERI*FACTU CONSTANTS
// ------------------------------------------------------------------
const PREFIX = 'BBH'

/**
 * 1. Generate the next consecutive invoice number atomically.
 */
export async function generateInvoiceNumber(
	type: 'F1' | 'I' = 'F1', // F1: Full, I: Simplified
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

	const paddedValue = sequence.last_value.toString().padStart(4, '0')
	return `${PREFIX}-${year}-${paddedValue}`
}

/**
 * 2. Processes an invoice: calculates hash (chaining), generates QR, and submits to AEAT.
 */
export async function processVerifactuInvoice(invoiceData: IInvoice) {
	// 1. Get previous invoice hash for chaining
	const lastInvoice = await prisma.cart.findFirst({
		where: { 
			status: 'completed', 
			hash: { not: null },
			invoice_number: { startsWith: `${PREFIX}-${new Date().getFullYear()}` }
		},
		orderBy: { created_at: 'desc' },
	})
	
	const previousHash = lastInvoice?.hash || null

	// 2. Generate Hash
	const hash = generateInvoiceHash(invoiceData, previousHash)
	invoiceData.hash = hash

	// 3. Generate QR URL
	const qrUrl = generateQrUrl(invoiceData)

	// 4. Submit to AEAT (Non-blocking or awaited based on requirement, here we return result)
	// Build XML payload (simplified for now, ideally uses a proper XML builder/template)
	const xmlPayload = `
		<SuministroLRFacturasEmitidas>
			<RegistroLRFacturasEmitidas>
				<Huella>${hash}</Huella>
				<!-- Add more fields as required by the WSDL -->
			</RegistroLRFacturasEmitidas>
		</SuministroLRFacturasEmitidas>
	`.trim()

	const isSubmitted = await submitToAeat(xmlPayload)

	return {
		hash,
		qrUrl,
		aeatStatus: isSubmitted ? 'submitted' : 'error'
	}
}

// Core entry point for VeriFactu processing
// (Already exported at function definition level)
