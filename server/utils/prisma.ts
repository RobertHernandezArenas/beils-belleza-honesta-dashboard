import 'dotenv/config'
// Triggering Nitro reload to pick up new Prisma Client
import pkg from '@prisma/client'
import type { PrismaClient as PrismaClientType } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import * as mariadb from 'mariadb'
const { PrismaClient } = pkg

// Create a connection pool config for the adapter
const poolConfig = {
	host: process.env.DATABASE_HOST,
	user: process.env.DATABASE_USER,
	password: process.env.DATABASE_PASSWORD,
	database: process.env.DATABASE_NAME,
	port: parseInt(process.env.DATABASE_PORT || '3306', 10),
	connectionLimit: 10,
}

// Initialize the Prisma MariaDB adapter
const adapter = new PrismaMariaDb(poolConfig)

const localGlobal = global as unknown as { prisma: PrismaClientType }

export const prisma =
	localGlobal.prisma ||
	new PrismaClient({
		adapter,
		log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
	})

if (process.env.NODE_ENV !== 'production') localGlobal.prisma = prisma
