import 'dotenv/config'
import { createConnection } from 'mariadb'

async function testSingleConnection() {
	console.log('🔌 Probando conexión DIRECTA con allowPublicKeyRetrieval: true...')
	console.log('Host:', process.env.DATABASE_HOST)
	console.log('User:', process.env.DATABASE_USER)

	try {
		const conn = await createConnection({
			host: process.env.DATABASE_HOST || '127.0.0.1',
			port: Number(process.env.DATABASE_PORT) || 3306,
			user: process.env.DATABASE_USER,
			password: process.env.DATABASE_PASSWORD,
			database: process.env.DATABASE_NAME,
			allowPublicKeyRetrieval: true,
			connectTimeout: 5000,
		})

		console.log('🎉 ¡¡CONEXIÓN 100% EXITOSA A LA BASE DE DATOS DE PLESK!! 🎉')
		const res = await conn.query('SELECT NOW() as current_time, USER() as db_user, DATABASE() as db_name')
		console.log('📊 Resultado:', res)
		await conn.end()
	} catch (err: any) {
		console.error('❌ Error en conexión:', err)
	}
}

testSingleConnection()
