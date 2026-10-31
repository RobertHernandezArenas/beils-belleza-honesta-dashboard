import { createError } from 'h3'
import type { AuthRepository } from './ports'

export interface GetMeDeps {
	auth: AuthRepository
}

export async function getMe(deps: GetMeDeps, { userId }: { userId: string }) {
	const user = await deps.auth.findById(userId)

	if (!user || user.status !== 'ON') {
		throw createError({
			statusCode: 403,
			statusMessage: 'Cuenta inactiva o no encontrada. Contacta con soporte admin.',
		})
	}

	return {
		user: {
			user_id: user.user_id,
			email: user.email,
			name: user.name,
			surname: user.surname,
			role: user.role,
			status: user.status,
			document_type: user.document_type,
			document_number: user.document_number,
			phone: user.phone,
			created_at: user.created_at,
		},
	}
}

