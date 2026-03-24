-- Beils Belleza Honesta - Complete Database Schema (MySQL/MariaDB Reference)
-- Generated from prisma/schema.prisma

SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table: users
-- ----------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `user_id` CHAR(100) NOT NULL PRIMARY KEY,
  `email` VARCHAR(50) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `name` VARCHAR(50) NOT NULL,
  `surname` VARCHAR(50) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `address` VARCHAR(255) NOT NULL,
  `city` VARCHAR(50) NOT NULL,
  `country` VARCHAR(50) NOT NULL,
  `postal_code` VARCHAR(20) NOT NULL,
  `gender` VARCHAR(10) NOT NULL,
  `birth_date` DATE NOT NULL,
  `role` ENUM('ADMIN', 'STAFF', 'CLIENT') NOT NULL DEFAULT 'CLIENT',
  `status` ENUM('ON', 'OFF') NOT NULL DEFAULT 'ON',
  `avatar` VARCHAR(255) NOT NULL,
  `document_type` ENUM('DNI', 'PASSPORT', 'NIE') NOT NULL DEFAULT 'DNI',
  `document_number` VARCHAR(20) NOT NULL,
  `annotations` TEXT NULL,
  `refresh_token` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX `users_role_idx` (`role`),
  INDEX `users_status_idx` (`status`),
  INDEX `users_created_at_idx` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ----------------------------
-- Table: categories
-- ----------------------------
CREATE TABLE IF NOT EXISTS `categories` (
  `category_id` CHAR(100) NOT NULL PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `description` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ----------------------------
-- Table: subcategories
-- ----------------------------
CREATE TABLE IF NOT EXISTS `subcategories` (
  `subcategory_id` CHAR(100) NOT NULL PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT NULL,
  `category_id` CHAR(100) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY `subcategories_name_category_id_key` (`name`, `category_id`),
  CONSTRAINT `subcategories_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ----------------------------
-- Table: tags
-- ----------------------------
CREATE TABLE IF NOT EXISTS `tags` (
  `tag_id` CHAR(100) NOT NULL PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL UNIQUE,
  `color` VARCHAR(20) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ----------------------------
-- Table: products
-- ----------------------------
CREATE TABLE IF NOT EXISTS `products` (
  `product_id` CHAR(100) NOT NULL PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `description` TEXT NULL,
  `sku` VARCHAR(50) NULL UNIQUE,
  `barcode` VARCHAR(50) NULL UNIQUE,
  `price` DOUBLE NOT NULL,
  `tax_rate` DOUBLE NOT NULL DEFAULT 21.0,
  `stock` INTEGER NOT NULL DEFAULT 0,
  `min_stock` INTEGER NOT NULL DEFAULT 0,
  `image_url` VARCHAR(255) NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'activo',
  `category_id` CHAR(100) NULL,
  `subcategory_id` CHAR(100) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX `products_category_id_idx` (`category_id`),
  INDEX `products_subcategory_id_idx` (`subcategory_id`),
  INDEX `products_status_idx` (`status`),
  CONSTRAINT `products_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`) ON DELETE SET NULL,
  CONSTRAINT `products_subcategory_id_fkey` FOREIGN KEY (`subcategory_id`) REFERENCES `subcategories` (`subcategory_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ----------------------------
-- Table: product_tags (Many-to-Many)
-- ----------------------------
CREATE TABLE IF NOT EXISTS `product_tags` (
  `product_id` CHAR(100) NOT NULL,
  `tag_id` CHAR(100) NOT NULL,
  PRIMARY KEY (`product_id`, `tag_id`),
  CONSTRAINT `product_tags_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE,
  CONSTRAINT `product_tags_tag_id_fkey` FOREIGN KEY (`tag_id`) REFERENCES `tags` (`tag_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ----------------------------
-- Table: services
-- ----------------------------
CREATE TABLE IF NOT EXISTS `services` (
  `service_id` CHAR(100) NOT NULL PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `description` TEXT NULL,
  `code` VARCHAR(50) NULL UNIQUE,
  `price` DOUBLE NOT NULL,
  `tax_rate` DOUBLE NOT NULL DEFAULT 21.0,
  `duration` INTEGER NOT NULL DEFAULT 30,
  `status` VARCHAR(20) NOT NULL DEFAULT 'activo',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ----------------------------
-- Table: packs
-- ----------------------------
CREATE TABLE IF NOT EXISTS `packs` (
  `pack_id` CHAR(100) NOT NULL PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `description` TEXT NULL,
  `code` VARCHAR(50) NULL UNIQUE,
  `price` DOUBLE NOT NULL,
  `tax_rate` DOUBLE NOT NULL DEFAULT 21.0,
  `status` VARCHAR(20) NOT NULL DEFAULT 'activo',
  `image_url` VARCHAR(255) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ----------------------------
-- Table: pack_item_products
-- ----------------------------
CREATE TABLE IF NOT EXISTS `pack_item_products` (
  `pack_id` CHAR(100) NOT NULL,
  `product_id` CHAR(100) NOT NULL,
  `quantity` INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (`pack_id`, `product_id`),
  CONSTRAINT `pack_item_products_pack_id_fkey` FOREIGN KEY (`pack_id`) REFERENCES `packs` (`pack_id`) ON DELETE CASCADE,
  CONSTRAINT `pack_item_products_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ----------------------------
-- Table: pack_item_services
-- ----------------------------
CREATE TABLE IF NOT EXISTS `pack_item_services` (
  `pack_id` CHAR(100) NOT NULL,
  `service_id` CHAR(100) NOT NULL,
  `quantity` INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (`pack_id`, `service_id`),
  CONSTRAINT `pack_item_services_pack_id_fkey` FOREIGN KEY (`pack_id`) REFERENCES `packs` (`pack_id`) ON DELETE CASCADE,
  CONSTRAINT `pack_item_services_service_id_fkey` FOREIGN KEY (`service_id`) REFERENCES `services` (`service_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ----------------------------
-- Table: coupons
-- ----------------------------
CREATE TABLE IF NOT EXISTS `coupons` (
  `coupon_id` CHAR(100) NOT NULL PRIMARY KEY,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `description` TEXT NULL,
  `discount_type` VARCHAR(50) NOT NULL,
  `discount_value` DOUBLE NOT NULL,
  `min_purchase` DOUBLE NULL,
  `max_uses` INTEGER NULL,
  `current_uses` INTEGER NOT NULL DEFAULT 0,
  `valid_from` DATETIME(3) NULL,
  `valid_until` DATETIME(3) NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'activo',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ----------------------------
-- Table: bonuses
-- ----------------------------
CREATE TABLE IF NOT EXISTS `bonuses` (
  `bonus_id` CHAR(100) NOT NULL PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `description` TEXT NULL,
  `total_sessions` INTEGER NOT NULL,
  `price` DOUBLE NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'activo',
  `service_id` CHAR(100) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT `bonuses_service_id_fkey` FOREIGN KEY (`service_id`) REFERENCES `services` (`service_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ----------------------------
-- Table: client_bonuses
-- ----------------------------
CREATE TABLE IF NOT EXISTS `client_bonuses` (
  `client_bonus_id` CHAR(100) NOT NULL PRIMARY KEY,
  `client_id` CHAR(100) NOT NULL,
  `bonus_id` CHAR(100) NOT NULL,
  `remaining_sessions` INTEGER NOT NULL,
  `purchase_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `expiration_date` DATETIME(3) NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'activo',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT `client_bonuses_bonus_id_fkey` FOREIGN KEY (`bonus_id`) REFERENCES `bonuses` (`bonus_id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ----------------------------
-- Table: giftcards
-- ----------------------------
CREATE TABLE IF NOT EXISTS `giftcards` (
  `giftcard_id` CHAR(100) NOT NULL PRIMARY KEY,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `initial_balance` DOUBLE NOT NULL,
  `current_balance` DOUBLE NOT NULL,
  `issue_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `expiration_date` DATETIME(3) NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'active',
  `client_id` CHAR(100) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ----------------------------
-- Table: sequences
-- ----------------------------
CREATE TABLE IF NOT EXISTS `sequences` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `type` VARCHAR(191) NOT NULL UNIQUE,
  `prefix` VARCHAR(191) NOT NULL,
  `year` INTEGER NOT NULL,
  `last_value` INTEGER NOT NULL DEFAULT 0,
  `updated_at` DATETIME(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ----------------------------
-- Table: carts
-- ----------------------------
CREATE TABLE IF NOT EXISTS `carts` (
  `cart_id` CHAR(100) NOT NULL PRIMARY KEY,
  `user_id` CHAR(100) NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
  `subtotal` DOUBLE NOT NULL DEFAULT 0,
  `discount` DOUBLE NOT NULL DEFAULT 0,
  `total` DOUBLE NOT NULL DEFAULT 0,
  `payment_method` VARCHAR(50) NULL,
  `notes` TEXT NULL,
  `applied_coupon` VARCHAR(50) NULL,
  `applied_giftcard` VARCHAR(50) NULL,
  `invoice_number` VARCHAR(50) NULL UNIQUE,
  `invoice_type` VARCHAR(4) NULL,
  `qr_content` TEXT NULL,
  `aeat_status` VARCHAR(50) NOT NULL DEFAULT 'pending_submission',
  `hash` VARCHAR(100) NULL,
  `previous_hash` VARCHAR(100) NULL,
  `stripe_payment_intent_id` VARCHAR(255) NULL,
  `stripe_installments` INTEGER NULL,
  `stripe_status` VARCHAR(50) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX `carts_user_id_idx` (`user_id`),
  INDEX `carts_status_idx` (`status`),
  INDEX `carts_created_at_idx` (`created_at`),
  CONSTRAINT `carts_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ----------------------------
-- Table: cart_items
-- ----------------------------
CREATE TABLE IF NOT EXISTS `cart_items` (
  `cart_item_id` CHAR(100) NOT NULL PRIMARY KEY,
  `cart_id` CHAR(100) NOT NULL,
  `item_type` VARCHAR(50) NOT NULL,
  `item_id` CHAR(100) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `quantity` INTEGER NOT NULL DEFAULT 1,
  `unit_price` DOUBLE NOT NULL,
  `tax_rate` DOUBLE NOT NULL DEFAULT 21.0,
  `subtotal` DOUBLE NOT NULL,
  `total` DOUBLE NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT `cart_items_cart_id_fkey` FOREIGN KEY (`cart_id`) REFERENCES `carts` (`cart_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ----------------------------
-- Table: debts
-- ----------------------------
CREATE TABLE IF NOT EXISTS `debts` (
  `debt_id` CHAR(100) NOT NULL PRIMARY KEY,
  `user_id` CHAR(100) NOT NULL,
  `cart_id` CHAR(100) NULL,
  `amount` DOUBLE NOT NULL,
  `remaining` DOUBLE NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
  `due_date` DATETIME(3) NULL,
  `notes` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX `debts_user_id_idx` (`user_id`),
  INDEX `debts_status_idx` (`status`),
  INDEX `debts_created_at_idx` (`created_at`),
  CONSTRAINT `debts_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT,
  CONSTRAINT `debts_cart_id_fkey` FOREIGN KEY (`cart_id`) REFERENCES `carts` (`cart_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ----------------------------
-- Table: debt_payments
-- ----------------------------
CREATE TABLE IF NOT EXISTS `debt_payments` (
  `payment_id` CHAR(100) NOT NULL PRIMARY KEY,
  `debt_id` CHAR(100) NOT NULL,
  `amount` DOUBLE NOT NULL,
  `payment_method` VARCHAR(50) NOT NULL,
  `payment_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `notes` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT `debt_payments_debt_id_fkey` FOREIGN KEY (`debt_id`) REFERENCES `debts` (`debt_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ----------------------------
-- Table: bookings
-- ----------------------------
CREATE TABLE IF NOT EXISTS `bookings` (
  `booking_id` CHAR(100) NOT NULL PRIMARY KEY,
  `client_id` CHAR(100) NOT NULL,
  `staff_id` CHAR(100) NULL,
  `item_type` VARCHAR(50) NOT NULL,
  `item_id` CHAR(100) NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
  `booking_date` DATETIME(3) NOT NULL,
  `start_time` VARCHAR(10) NOT NULL,
  `end_time` VARCHAR(10) NOT NULL,
  `duration` INTEGER NOT NULL,
  `notes` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX `bookings_client_id_idx` (`client_id`),
  INDEX `bookings_staff_id_idx` (`staff_id`),
  INDEX `bookings_booking_date_idx` (`booking_date`),
  INDEX `bookings_status_idx` (`status`),
  CONSTRAINT `bookings_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT,
  CONSTRAINT `bookings_staff_id_fkey` FOREIGN KEY (`staff_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ----------------------------
-- Table: questionnaires
-- ----------------------------
CREATE TABLE IF NOT EXISTS `questionnaires` (
  `questionnaire_id` CHAR(100) NOT NULL PRIMARY KEY,
  `user_id` CHAR(100) NOT NULL,
  `title` VARCHAR(150) NOT NULL,
  `data` JSON NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT `questionnaires_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ----------------------------
-- Table: consents
-- ----------------------------
CREATE TABLE IF NOT EXISTS `consents` (
  `consent_id` CHAR(100) NOT NULL PRIMARY KEY,
  `user_id` CHAR(100) NULL,
  `consent_type` ENUM('LGPD', 'INDIBA', 'LASER_INNOVA_PRO_SHR') NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'UNSIGNED',
  `signed_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `document_url` VARCHAR(255) NULL,
  `notes` VARCHAR(255) NULL,
  `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NULL,
  UNIQUE KEY `consents_user_id_consent_type_key` (`user_id`, `consent_type`),
  CONSTRAINT `consents_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ----------------------------
-- Table: revokes
-- ----------------------------
CREATE TABLE IF NOT EXISTS `revokes` (
  `revoke_id` CHAR(100) NOT NULL PRIMARY KEY,
  `user_id` CHAR(100) NOT NULL,
  `reason` TEXT NULL,
  `date_revoked` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT `revokes_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
