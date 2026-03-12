# Base de Datos (Prisma)

El proyecto utiliza **Prisma** como ORM sobre una base de datos MySQL (o MariaDB). El origen de la verdad de
los datos es el archivo `prisma/schema.prisma`.

## Estructura General

El esquema está dividido en fases lógicas (módulos), lo que facilita su comprensión.

### 1. Usuarios y Seguridad (Users)

- **`User`**: El modelo central del sistema. Representa tanto a Clientes (Client) como a Empleados (Staff) y
  Administradores (Admin).
   - Usa enums para roles (`ADMIN`, `USER`) y estados (`ON`, `OFF`).
   - Gestiona credenciales, datos de contacto y tipo de documento de identidad (`DNI`, `PASSPORT`, `NIE`).
   - Es el punto de relación hacia el CRM, Carritos de compra (compradores) y Citas (cliente o empleado
     asignado).

### 2. CRM y Documentos (Phase 1)

Modelos relacionados con el perfil médico y legal del cliente (ligados por `user_id` en cascada):

- **`Consent`**: Almacena el enlace o archivo de consentimientos informados firmados.
- **`Questionnaire`**: Formularios médicos dinámicos respondidos por el cliente (datos arbitrarios guardados
  como tipo `Json`).
- **`Revoke`**: Historial de revocaciones de consentimientos.

### 3. Catálogo e Inventario (Phase 2)

Estructura de categorización de los productos físicos a la venta o uso interno:

- **`Product`**: Datos del producto físico (precio, stock actual, stock mínimo, SKU, código de barras).

- **`Category` & `Subcategory`**: Taxonomía jerárquica para la clasificación.
- **`Tag`**: Sistema de etiquetado (relación N:M a través de `ProductTag`).

### 4. Servicios y Packs (Phase 3)

Lo que el salón ofrece:

- **`Service`**: Prestaciones de tiempo (ej. _Corte de Pelo_, _Láser_). Tienen un precio base, impuestos y una
  duración en minutos.
- **`Pack`**: Agrupación comercial que combina múltiples Productos y/o Servicios en un único ítem vendible con
  un precio cerrado.
   - Usa tablas intermedias (`PackItemProduct` y `PackItemService`) para enlazar las proporciones.

### 5. Marketing y Fidelización (Phase 4)

Sistema de incentivos:

- **`Coupon`**: Códigos promocionales (porcentaje o valor fijo) con reglas de uso y caducidad.
- **`Bonus`**: Packs de "Sesiones" pre-compradas de un servicio (Ej. _Bono 5 sesiones Láser Diódo_).
- **`ClientBonus`**: Instancia de un Bono asignada a un cliente particular, rastrea cuántas sesiones restan
  por consumir.
- **`Giftcard`**: Tarjetas de regalo con un saldo monedero prepagado.

### 6. Citas y Agenda (Phase 6)

Reservas de tiempo:

- **`Booking`**: Representa un hueco en el calendario.
   - Relaciona a dos usuarios: `client_id` (quien recibe el servicio) y `staff_id` (quien lo realiza).
   - Guarda referencia genérica (`item_type`, `item_id`) a qué _Servicio_ o _Pack_ se reservó.
   - Controla la hora exacta (`start_time`, `end_time`) y su estado (confirmado, completado, cancelado).

### 7. TPV, Ventas y Veri\*Factu (Phase 5 & Sequences)

El núcleo comercial y legal de la aplicación:

- **`Cart` (Carrito / Ticket / Factura):** Un acto de venta.
   - Agrupa subtotales, totales y descuentos.
   - Registra qué método de pago y cupones se aplicaron.
   - **Veri\*Factu**: Contiene los campos exigidos por la AEAT:
      - `invoice_number`: Número de factura formal (Ej: BBH-2026-0001).
      - `invoice_type`: F1 (Completa) o F2 (Ticket simplificado).
      - `qr_content`: URL del código QR para la agencia tributaria.
      - `hash` y `previous_hash`: Cadena criptográfica obligatoria para garantizar la inmutabilidad
        secuencial.
      - `aeat_status`: Estado de la remisión al servidor de Hacienda.
- **`CartItem`**: Líneas individuales de venta dentro de un carrito, polimórfricas (`item_type` define si se
  vende un producto, servicio, pack, bono o tarjeta de regalo). Es crucial para "congelar" el `name` y el
  `unit_price` en el momento en que se efectúa la venta (Snapshot).
- **`Debt`**: Registro de pagos pendientes si un carrito no se abonó en su totalidad.
- **`Sequence`**: Tabla vital técnica que asegura que las numeraciones de facturas (ej. `last_value` para una
  serie `BBH` y año `2026`) sean secuenciales, sin saltos. Funciona como contador seguro para evitar
  duplicados.

---

## Modificando la Base de Datos

Cada vez que alteres `prisma/schema.prisma`:

1. **Sincronizar el esquema hacia la base de datos:**
   ```bash
   pnpm prisma db push # Entornos de desarrollo locales
   # o, para producción/esquemas estrictos:
   pnpm prisma migrate dev --name descripcion_cambio
   ```
2. **Regenerar los tipos de TypeScript (Obligatorio para que la app no lance errores de tipo al compilar):**
   ```bash
   pnpm prisma generate
   ```
