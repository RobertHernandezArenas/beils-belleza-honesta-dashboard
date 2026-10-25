import * as soap from 'soap'
import * as https from 'https'
import * as fs from 'node:fs'
import { isAeatConfigured, type AeatSubmissionResult } from './aeat-status'

/**
 * Submits an invoice XML payload to the AEAT via SOAP with mTLS authentication.
 */
export const submitToAeat = async (xmlPayload: string): Promise<AeatSubmissionResult> => {
	const config = useRuntimeConfig()

	// Without a certificate nothing is sent: report it as such, never as a successful submission
	if (!isAeatConfigured(config)) {
		const log = process.env.NODE_ENV === 'production' ? console.error : console.warn
		log('[VERIFACTU] AEAT certificate not configured: invoice NOT submitted (status not_configured).')
		return 'not_configured'
	}

	try {
		const p12Buffer = await fs.promises.readFile(config.aeatP12CertPath)
		const agent = new https.Agent({
			pfx: p12Buffer,
			passphrase: config.aeatP12Password,
			rejectUnauthorized: process.env.NODE_ENV === 'production',
			timeout: 10000 // 10s socket timeout
		})

		const client = await soap.createClientAsync(config.aeatWsdlUrl, {
			wsdl_options: { agent }
		})

		// This assumes the WSDL operation name is SuministroLRFacturasEmitidas
		// Actual implementation may vary based on the specific WSDL structure
		const [result] = await client.SuministroLRFacturasEmitidasAsync({ 
			xmlData: xmlPayload 
		})

		const accepted = result && (result.EstadoEnvio === 'Correcto' || result.EstadoEnvio === 'AceptadoConErrores')
		return accepted ? 'submitted' : 'rejected'
	} catch (rawError) {
		const error = toApiError(rawError)
		console.error('Error in AEAT SOAP communication:', error)
		throw createError({
			statusCode: 502,
			statusMessage: 'Error de pasarela de la Administración Tributaria',
			cause: error
		})
	}
}
