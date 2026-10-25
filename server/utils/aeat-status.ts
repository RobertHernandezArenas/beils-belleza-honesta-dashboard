/**
 * Honest AEAT (VeriFactu) submission states. An invoice is only `submitted` when the AEAT
 * actually accepted it; without a certificate nothing is sent and it stays `not_configured`
 * (pending a real submission), instead of being reported as submitted.
 */

export type AeatSubmissionResult = 'submitted' | 'rejected' | 'not_configured'
export type AeatStatus = 'submitted' | 'error' | 'not_configured'

export function isAeatConfigured(config: { aeatP12CertPath?: string; aeatP12Password?: string }) {
	return !!config.aeatP12CertPath && !!config.aeatP12Password
}

export function toAeatStatus(result: AeatSubmissionResult): AeatStatus {
	if (result === 'submitted') return 'submitted'
	if (result === 'not_configured') return 'not_configured'
	return 'error'
}
