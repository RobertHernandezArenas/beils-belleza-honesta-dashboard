import 'dotenv/config'
import { prisma } from '../server/utils/prisma'

async function checkConnection() {
	try {
		console.log('🔌 Intentando conectar a la base de datos...')
		
		// Un simple SELECT 1 para verificar conectividad
		await prisma.$queryRaw`SELECT 1`
		
		console.log('✅ ¡Conexión exitosa!')
		console.log('📡 Base de Datos:', process.env.DATABASE_NAME || 'beils_belleza_honesta_db')
		console.log('🏠 Host:', process.env.DATABASE_HOST || 'localhost')
		
	} catch (error: any) {
		console.error('❌ Error de conexión:', error.message)
		if (error.code === 'P2002') {
			console.error('💡 Nota: Problema de restricción única.')
		} else if (error.code === 'P1001') {
			console.error('💡 Nota: No se pudo conectar al servidor de base de datos. Verifica el HOST y PUERTO.')
		} else if (error.code === 'P1003') {
			console.error('💡 Nota: La base de datos no existe.')
		}
		process.exit(1)
	} finally {
		await prisma.$disconnect()
	}
}

checkConnection()
