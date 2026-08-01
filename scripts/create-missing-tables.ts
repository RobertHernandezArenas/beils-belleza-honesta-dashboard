import 'dotenv/config'
import pkg from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'

const { PrismaClient } = pkg

const poolConfig = {
	host: process.env.DATABASE_HOST || '46.202.140.68',
	user: process.env.DATABASE_USER,
	password: process.env.DATABASE_PASSWORD,
	database: process.env.DATABASE_NAME,
	port: parseInt(process.env.DATABASE_PORT || '3306', 10),
	connectionLimit: 10,
	allowPublicKeyRetrieval: true,
}

const prisma = new PrismaClient({
	adapter: new PrismaMariaDb(poolConfig)
})

async function main() {
	try {
		console.log('🔨 Creating missing package tables if not exist...')

		await prisma.$executeRawUnsafe(`
			CREATE TABLE IF NOT EXISTS \`packages\` (
			  \`package_id\` CHAR(100) NOT NULL,
			  \`name\` VARCHAR(150) NOT NULL,
			  \`description\` TEXT NULL,
			  \`type\` ENUM('INDIVIDUAL', 'MIXTO') NOT NULL DEFAULT 'INDIVIDUAL',
			  \`price\` DOUBLE NOT NULL,
			  \`total_sessions\` INT NOT NULL DEFAULT 1,
			  \`service_id\` CHAR(100) NULL,
			  \`status\` VARCHAR(20) NOT NULL DEFAULT 'activo',
			  \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
			  \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
			  PRIMARY KEY (\`package_id\`)
			) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
		`)

		await prisma.$executeRawUnsafe(`
			CREATE TABLE IF NOT EXISTS \`package_items\` (
			  \`package_item_id\` CHAR(100) NOT NULL,
			  \`package_id\` CHAR(100) NOT NULL,
			  \`item_type\` VARCHAR(20) NOT NULL DEFAULT 'SERVICE',
			  \`item_id\` CHAR(100) NOT NULL,
			  \`name\` VARCHAR(150) NOT NULL,
			  \`quantity\` INT NOT NULL DEFAULT 1,
			  \`duration\` INT NOT NULL DEFAULT 30,
			  \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
			  \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
			  PRIMARY KEY (\`package_item_id\`),
			  INDEX \`package_items_package_id_idx\` (\`package_id\`),
			  CONSTRAINT \`package_items_package_id_fkey\` FOREIGN KEY (\`package_id\`) REFERENCES \`packages\` (\`package_id\`) ON DELETE CASCADE ON UPDATE CASCADE
			) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
		`)

		await prisma.$executeRawUnsafe(`
			CREATE TABLE IF NOT EXISTS \`client_packages\` (
			  \`client_package_id\` CHAR(100) NOT NULL,
			  \`user_id\` CHAR(100) NOT NULL,
			  \`package_id\` CHAR(100) NOT NULL,
			  \`total_sessions\` INT NOT NULL,
			  \`remaining_sessions\` INT NOT NULL,
			  \`expiry_date\` DATETIME(3) NULL,
			  \`status\` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
			  \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
			  \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
			  PRIMARY KEY (\`client_package_id\`),
			  INDEX \`client_packages_user_id_idx\` (\`user_id\`),
			  INDEX \`client_packages_package_id_idx\` (\`package_id\`),
			  CONSTRAINT \`client_packages_user_id_fkey\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`user_id\`) ON DELETE CASCADE ON UPDATE CASCADE,
			  CONSTRAINT \`client_packages_package_id_fkey\` FOREIGN KEY (\`package_id\`) REFERENCES \`packages\` (\`package_id\`) ON DELETE CASCADE ON UPDATE CASCADE
			) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
		`)

		await prisma.$executeRawUnsafe(`
			CREATE TABLE IF NOT EXISTS \`client_package_items\` (
			  \`client_package_item_id\` CHAR(100) NOT NULL,
			  \`client_package_id\` CHAR(100) NOT NULL,
			  \`package_item_id\` CHAR(100) NOT NULL,
			  \`name\` VARCHAR(150) NOT NULL,
			  \`item_type\` VARCHAR(20) NOT NULL DEFAULT 'SERVICE',
			  \`quantity_total\` INT NOT NULL DEFAULT 1,
			  \`quantity_remaining\` INT NOT NULL DEFAULT 1,
			  \`duration\` INT NOT NULL DEFAULT 30,
			  \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
			  \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
			  PRIMARY KEY (\`client_package_item_id\`),
			  INDEX \`client_package_items_client_package_id_idx\` (\`client_package_id\`),
			  INDEX \`client_package_items_package_item_id_idx\` (\`package_item_id\`),
			  CONSTRAINT \`client_package_items_client_package_id_fkey\` FOREIGN KEY (\`client_package_id\`) REFERENCES \`client_packages\` (\`client_package_id\`) ON DELETE CASCADE ON UPDATE CASCADE,
			  CONSTRAINT \`client_package_items_package_item_id_fkey\` FOREIGN KEY (\`package_item_id\`) REFERENCES \`package_items\` (\`package_item_id\`) ON DELETE CASCADE ON UPDATE CASCADE
			) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
		`)

		console.log('✅ Tables created successfully!')
	} catch (e) {
		console.error('❌ Error creating tables:', e)
	} finally {
		await prisma.$disconnect()
	}
}

main()
