import * as mariadb from 'mariadb'
import 'dotenv/config'

async function checkAndFix() {
    const pool = mariadb.createPool({
        host: process.env.DATABASE_HOST,
        user: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        database: process.env.DATABASE_NAME,
        port: parseInt(process.env.DATABASE_PORT || '3306', 10),
    })

    let conn;
    try {
        conn = await pool.getConnection();
        console.log('Connected to DB:', process.env.DATABASE_NAME);
        
        const tables = await conn.query('SHOW TABLES');
        const tableList = tables.map((t: any) => Object.values(t)[0]);
        console.log('Existing tables:', tableList);

        const exists = tableList.includes('booking_items');
        
        if (!exists) {
            console.log('Table booking_items is missing. Creating...');
            await conn.query(`
                CREATE TABLE booking_items (
                    booking_item_id CHAR(100) NOT NULL,
                    booking_id CHAR(100) NOT NULL,
                    item_type VARCHAR(50) NOT NULL,
                    item_id CHAR(100) NOT NULL,
                    name VARCHAR(150) NOT NULL,
                    duration INT NOT NULL DEFAULT 0,
                    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                    PRIMARY KEY (booking_item_id),
                    CONSTRAINT booking_items_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES bookings (booking_id) ON DELETE CASCADE ON UPDATE CASCADE
                ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
            `);
            console.log('✅ Table booking_items created successfully.');
        } else {
            console.log('✅ Table booking_items already exists.');
        }

        // Check client_packages.custom_price column
        const packageCols = await conn.query("SHOW COLUMNS FROM client_packages LIKE 'custom_price'");
        if (packageCols.length === 0) {
            console.log('Column client_packages.custom_price is missing. Adding...');
            await conn.query('ALTER TABLE client_packages ADD COLUMN custom_price DOUBLE NULL AFTER expiry_date');
            console.log('✅ Column client_packages.custom_price added successfully.');
        } else {
            console.log('✅ Column client_packages.custom_price already exists.');
        }

        // Check client_package_items table
        if (!tableList.includes('client_package_items')) {
            console.log('Table client_package_items is missing. Creating...');
            await conn.query(`
                CREATE TABLE client_package_items (
                    client_package_item_id CHAR(100) NOT NULL,
                    client_package_id CHAR(100) NOT NULL,
                    package_item_id CHAR(100) NOT NULL,
                    name VARCHAR(150) NOT NULL,
                    item_type VARCHAR(20) NOT NULL DEFAULT 'SERVICE',
                    quantity_total INT NOT NULL DEFAULT 1,
                    quantity_remaining INT NOT NULL DEFAULT 1,
                    duration INT NOT NULL DEFAULT 30,
                    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
                    PRIMARY KEY (client_package_item_id),
                    INDEX client_package_items_client_package_id_idx (client_package_id),
                    INDEX client_package_items_package_item_id_idx (package_item_id),
                    CONSTRAINT client_package_items_client_package_id_fkey FOREIGN KEY (client_package_id) REFERENCES client_packages (client_package_id) ON DELETE CASCADE,
                    CONSTRAINT client_package_items_package_item_id_fkey FOREIGN KEY (package_item_id) REFERENCES package_items (package_item_id) ON DELETE CASCADE
                ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
            `);
            console.log('✅ Table client_package_items created successfully.');
        } else {
            console.log('✅ Table client_package_items already exists.');
        }

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        if (conn) conn.end();
        await pool.end();
    }
}

checkAndFix()
