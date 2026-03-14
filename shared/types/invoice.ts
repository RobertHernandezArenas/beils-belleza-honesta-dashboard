export interface IIssuer {
	nif: string
	name: string
}

export interface IInvoice {
	id: string
	invoiceNumber: string
	issueDate: string // ISO 8601 string for safe transport/storage
	issuer: IIssuer
	totalAmount: number
	hash?: string | null
	previousHash?: string | null
}

export type AEATStatus = 'pending_submission' | 'submitted' | 'accepted' | 'accepted_with_errors' | 'rejected' | 'error'
