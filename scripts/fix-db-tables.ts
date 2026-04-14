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

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        if (conn) conn.end();
        await pool.end();
    }
}

checkAndFix()
