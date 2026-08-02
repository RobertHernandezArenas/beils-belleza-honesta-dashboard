-- ============================================================================
-- Borra TODO rastro de un cliente (usuario) y sus registros relacionados.
-- Cliente: 4bec0298-ca76-4480-adfc-9ebd1078f47f
--
-- ⚠️  DESTRUCTIVO E IRREVERSIBLE. Haz un backup de la base de datos antes.
-- Ejecuta el bloque completo (es una transacción: o se aplica todo, o nada).
--
-- El orden respeta las claves foráneas. Las tablas hijas con ON DELETE CASCADE
-- (booking_items, cart_items, debt_payments, client_package_items) se borran
-- solas con su tabla padre.
-- ============================================================================

SET @uid = '4bec0298-ca76-4480-adfc-9ebd1078f47f';

START TRANSACTION;

-- Deudas (arrastra debt_payments). Antes que carts, porque debts referencia carts.
DELETE FROM debts            WHERE user_id   = @uid;

-- Ventas/tickets (arrastra cart_items). Antes que bookings, porque carts.booking_id -> bookings.
DELETE FROM carts            WHERE user_id   = @uid;

-- Citas (arrastra booking_items).
DELETE FROM bookings         WHERE client_id = @uid;

-- Bonos/paquetes del cliente (arrastra client_package_items).
DELETE FROM client_packages  WHERE user_id   = @uid;

-- Documentos legales / salud.
DELETE FROM consents         WHERE user_id   = @uid;
DELETE FROM questionnaires   WHERE user_id   = @uid;
DELETE FROM revokes          WHERE user_id   = @uid;

-- Finalmente, el usuario.
DELETE FROM users            WHERE user_id   = @uid;

COMMIT;

-- Verificación (debe devolver 0 en todas):
-- SELECT
--   (SELECT COUNT(*) FROM users            WHERE user_id   = '4bec0298-ca76-4480-adfc-9ebd1078f47f') AS users,
--   (SELECT COUNT(*) FROM bookings         WHERE client_id = '4bec0298-ca76-4480-adfc-9ebd1078f47f') AS bookings,
--   (SELECT COUNT(*) FROM carts            WHERE user_id   = '4bec0298-ca76-4480-adfc-9ebd1078f47f') AS carts,
--   (SELECT COUNT(*) FROM debts            WHERE user_id   = '4bec0298-ca76-4480-adfc-9ebd1078f47f') AS debts,
--   (SELECT COUNT(*) FROM client_packages  WHERE user_id   = '4bec0298-ca76-4480-adfc-9ebd1078f47f') AS packages,
--   (SELECT COUNT(*) FROM consents         WHERE user_id   = '4bec0298-ca76-4480-adfc-9ebd1078f47f') AS consents;
