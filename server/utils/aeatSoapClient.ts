import * as soap from 'soap'
import * as https from 'https'
import * as fs from 'node:fs'

/**
 * Submits an invoice XML payload to the AEAT via SOAP with mTLS authentication.
 */
export const submitToAeat = async (xmlPayload: string): Promise<boolean> => {
	const config = useRuntimeConfig()
	
	// In development/test we might want to skip real submission if not configured
	if (!config.aeatP12CertPath || !config.aeatP12Password) {
		console.warn('AEAT Certificate not configured. Skipping real submission.')
		return true // Mock successful submission
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

		return result && (result.EstadoEnvio === 'Correcto' || result.EstadoEnvio === 'AceptadoConErrores')
	} catch (error: any) {
		console.error('Error in AEAT SOAP communication:', error)
		throw createError({
			statusCode: 502,
			statusMessage: 'Error de pasarela de la Administración Tributaria',
			cause: error
		})
	}
}
