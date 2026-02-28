import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import * as mariadb from 'mariadb'

// Create a connection pool config for the adapter
const poolConfig = {
	host: process.env.DATABASE_HOST || 'localhost',
	user: process.env.DATABASE_USER || 'root',
	password: process.env.DATABASE_PASSWORD || '24Enero2011.',
	database: process.env.DATABASE_NAME || 'transpallet_plus_db',
	port: parseInt(process.env.DATABASE_PORT || '3306', 10),
	connectionLimit: 10,
}

// Initialize the Prisma MariaDB adapter
const adapter = new PrismaMariaDb(poolConfig)

const localGlobal = global as unknown as { prisma: PrismaClient }

export const prisma =
	localGlobal.prisma ||
	new PrismaClient({
		adapter,
		log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
	})

if (process.env.NODE_ENV !== 'production') localGlobal.prisma = prisma
