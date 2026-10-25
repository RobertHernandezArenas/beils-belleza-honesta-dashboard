import { createError } from 'h3'
import type { z } from 'zod'

/** Parses a request body with a zod schema, turning validation errors into a 400 with a readable message. */
export function parseOrBadRequest<T extends z.ZodTypeAny>(schema: T, body: unknown): z.infer<T> {
	const result = schema.safeParse(body ?? {})
	if (!result.success) {
		const issue = result.error.issues[0]
		const message =
			issue?.code === 'unrecognized_keys' ? `Campo no permitido: ${issue.keys.join(', ')}` : issue?.message || 'Datos inválidos'
		throw createError({ statusCode: 400, statusMessage: message })
	}
	return result.data
}
