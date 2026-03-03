import { defineEventHandler, getRouterParam, createError } from 'h3'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async event => {
	try {
		const id = getRouterParam(event, 'id')
		if (!id) {
			throw createError({ statusCode: 400, statusMessage: 'ID requerido' })
		}

		// First, check if brand is being used by any product
		const productsCount = await prisma.product.count({
			where: { brand_id: id },
		})

		if (productsCount > 0) {
			throw createError({
				statusCode: 409,
				statusMessage: `No se puede eliminar la marca porque tiene ${productsCount} producto(s) asociado(s).`,
			})
		}

		await prisma.brand.delete({
			where: { brand_id: id },
		})

		return { success: true }
	} catch (error: any) {
		if (error.code === 'P2025') {
			throw createError({ statusCode: 404, statusMessage: 'Marca no encontrada' })
		}
		if (error.statusCode) throw error
		throw createError({
			statusCode: 500,
			statusMessage: 'Error al eliminar la marca',
		})
	}
})
