import 'dotenv/config'
import { prisma } from '../server/utils/prisma'
import { execSync } from 'child_process'

async function resetDB() {
  try {
    console.log('🔄 Sincronizando esquema con la base de datos (prisma db push)...')
    // Esto asegura que todas las tablas existan según schema.prisma sin crear migraciones de historia
    execSync('pnpx prisma db push --accept-data-loss --schema prisma/schema.prisma', { stdio: 'inherit' })

    console.log('🧹 Limpiando todas las tablas para dejarlas vacías...')
    
    // Obtenemos todos los modelos del cliente de Prisma
    const models = Object.keys(prisma).filter(key => 
      !key.startsWith('$') && !key.startsWith('_') && typeof (prisma as any)[key].deleteMany === 'function'
    )

    // Desactivamos checks de llaves foráneas para poder borrar todo ordenadamente
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;')
    
    for (const modelName of models) {
      console.log(`🗑️ Limpiando tabla: ${modelName}`)
      await (prisma as any)[modelName].deleteMany()
    }

    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;')

    console.log('✅ Base de datos reseteada y todas las tablas están vacías.')
  } catch (error: any) {
    console.error('❌ Error al resetear la base de datos:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

resetDB()
