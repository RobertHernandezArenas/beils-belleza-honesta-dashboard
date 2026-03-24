import { prisma } from '../utils/prisma'

export default defineEventHandler(async () => {
	try {
		console.log('🧪 Diagnosing database connection...')
		
		// Attempt a simple query
		const result = await prisma.$queryRaw`SELECT 1 as connected`
		
		return {
			status: 'success',
			message: 'Conexión exitosa a la base de datos.',
			data: result,
			env: {
				host: process.env.DATABASE_HOST || 'not set',
				user: process.env.DATABASE_USER || 'not set',
				database: process.env.DATABASE_NAME || 'not set',
				port: process.env.DATABASE_PORT || 'not set',
			}
		}
	} catch (error: any) {
		console.error('❌ Database Diagnosis Failed:', error)
		return {
			status: 'error',
			message: 'Error al conectar a la base de datos.',
			error: error.message,
			code: error.code,
			env: {
				host: process.env.DATABASE_HOST || 'not set',
				user: process.env.DATABASE_USER || 'not set',
				database: process.env.DATABASE_NAME || 'not set',
				port: process.env.DATABASE_PORT || 'not set',
			}
		}
	}
})
