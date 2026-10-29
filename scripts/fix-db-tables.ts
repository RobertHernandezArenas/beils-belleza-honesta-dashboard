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

        // Check users login lockout columns (3 failed attempts -> temporary lock)
        const lockoutCols = await conn.query("SHOW COLUMNS FROM users LIKE 'failed_login_count'");
        if (lockoutCols.length === 0) {
            console.log('Login lockout columns are missing. Adding...');
            await conn.query('ALTER TABLE users ADD COLUMN failed_login_count INT NOT NULL DEFAULT 0, ADD COLUMN locked_until DATETIME(3) NULL');
            console.log('✅ Columns users.failed_login_count / users.locked_until added successfully.');
        } else {
            console.log('✅ Login lockout columns already exist.');
        }

        // Check users.token_version (bumped to revoke all sessions of a user)
        const tokenVersionCol = await conn.query("SHOW COLUMNS FROM users LIKE 'token_version'");
        if (tokenVersionCol.length === 0) {
            console.log('Column users.token_version is missing. Adding...');
            await conn.query('ALTER TABLE users ADD COLUMN token_version INT NOT NULL DEFAULT 0');
            console.log('✅ Column users.token_version added successfully.');
        } else {
            console.log('✅ Column users.token_version already exists.');
        }

        // Check client_package_shares table (bonos shared with other clients)
        if (!tableList.includes('client_package_shares')) {
            console.log('Table client_package_shares is missing. Creating...');
            await conn.query(`
                CREATE TABLE client_package_shares (
                    share_id CHAR(100) NOT NULL,
                    client_package_id CHAR(100) NOT NULL,
                    user_id CHAR(100) NOT NULL,
                    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                    PRIMARY KEY (share_id),
                    UNIQUE INDEX client_package_shares_client_package_id_user_id_key (client_package_id, user_id),
                    INDEX client_package_shares_user_id_idx (user_id),
                    CONSTRAINT client_package_shares_client_package_id_fkey FOREIGN KEY (client_package_id) REFERENCES client_packages (client_package_id) ON DELETE CASCADE ON UPDATE CASCADE,
                    CONSTRAINT client_package_shares_user_id_fkey FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE ON UPDATE CASCADE
                ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
            `);
            console.log('✅ Table client_package_shares created successfully.');
        } else {
            console.log('✅ Table client_package_shares already exists.');
        }

        // Check coupons table (same shape as the legacy reference schema)
        if (!tableList.includes('coupons')) {
            console.log('Table coupons is missing. Creating...');
            await conn.query(`
                CREATE TABLE coupons (
                    coupon_id CHAR(100) NOT NULL,
                    code VARCHAR(50) NOT NULL,
                    description TEXT NULL,
                    discount_type VARCHAR(50) NOT NULL,
                    discount_value DOUBLE NOT NULL,
                    min_purchase DOUBLE NULL,
                    max_uses INT NULL,
                    current_uses INT NOT NULL DEFAULT 0,
                    valid_from DATETIME(3) NULL,
                    valid_until DATETIME(3) NULL,
                    status VARCHAR(20) NOT NULL DEFAULT 'activo',
                    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
                    PRIMARY KEY (coupon_id),
                    UNIQUE INDEX coupons_code_key (code)
                ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
            `);
            console.log('✅ Table coupons created successfully.');
        } else {
            console.log('✅ Table coupons already exists.');
        }

        // Check carts discount snapshot columns (coupon + manual discount frozen at sale time)
        const cartSnapshotColumns: [string, string][] = [
            ['coupon_id', 'CHAR(100) NULL'],
            ['coupon_code', 'VARCHAR(50) NULL'],
            ['coupon_discount_type', 'VARCHAR(20) NULL'],
            ['coupon_discount_value', 'DOUBLE NULL'],
            ['coupon_discount_amount', 'DOUBLE NULL'],
            ['manual_discount_type', 'VARCHAR(20) NULL'],
            ['manual_discount_value', 'DOUBLE NULL'],
            ['manual_discount_amount', 'DOUBLE NULL'],
        ];
        for (const [column, definition] of cartSnapshotColumns) {
            const existing = await conn.query(`SHOW COLUMNS FROM carts LIKE '${column}'`);
            if (existing.length === 0) {
                console.log(`Column carts.${column} is missing. Adding...`);
                await conn.query(`ALTER TABLE carts ADD COLUMN ${column} ${definition}`);
                console.log(`✅ Column carts.${column} added successfully.`);
            } else {
                console.log(`✅ Column carts.${column} already exists.`);
            }
        }

        const couponIndex = await conn.query("SHOW INDEX FROM carts WHERE Key_name = 'carts_coupon_id_idx'");
        if (couponIndex.length === 0) {
            console.log('Index carts_coupon_id_idx is missing. Adding...');
            await conn.query('CREATE INDEX carts_coupon_id_idx ON carts (coupon_id)');
            console.log('✅ Index carts_coupon_id_idx added successfully.');
        } else {
            console.log('✅ Index carts_coupon_id_idx already exists.');
        }

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        if (conn) conn.end();
        await pool.end();
    }
}

checkAndFix()
