import 'dotenv/config'
// Triggering Nitro reload to pick up new Prisma Client
import pkg from '@prisma/client'
import type { PrismaClient as PrismaClientType } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
const { PrismaClient } = pkg

// Create a connection pool config for the adapter
const host = (process.env.DATABASE_HOST === 'localhost' || !process.env.DATABASE_HOST) ? '127.0.0.1' : process.env.DATABASE_HOST

const poolConfig = {
	host,
	user: process.env.DATABASE_USER,
	password: process.env.DATABASE_PASSWORD,
	database: process.env.DATABASE_NAME,
	port: parseInt(process.env.DATABASE_PORT || '3306', 10),
	connectionLimit: 10,
	allowPublicKeyRetrieval: true,
}

const localGlobal = global as unknown as { 
    prisma: PrismaClientType
}

export const prisma =
	localGlobal.prisma ||
	new PrismaClient({
		adapter: new PrismaMariaDb(poolConfig),
		log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
	})

if (process.env.NODE_ENV !== 'production') localGlobal.prisma = prisma
