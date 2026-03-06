# TPV, Ventas y Veri\*Factu (Facturación Electrónica AEAT)

El módulo de Punto de Venta (TPV) representa el cobro comercial, interconectando todos los demás módulos y
materializando las ganancias transaccionales mediante el respeto estricto a las regulaciones de facturación
española.

---

## El Núcleo Contable: Carrito (`Cart`) y Carrito Item (`CartItem`)

Un pago en "Beils Dashboard" es tratado holísticamente mediante el paradigma de Carrito.

### 1. Cabecera Venta: `Cart`

Representa el acto holístico de pagar. Engloba metadatos totales:

- **Actores:** `user_id` (Opcional si es Cliente final anónimo, crucial si es recurrente para su historial).
- **Balance Financiero:** `subtotal` (Sin IVA), `discount` (Cupones o promos), y `total` (A pagar final).
- **Estado Transaccional:** `pending` (abierto mientras el dependiente añade items), `completed` (pagado y
  procesado).
- **Método de Pago:** `payment_method` (Efectivo `cash`, Tarjeta `card`, mixto...).
- **Lealtad/Fidelización:** Referencia estática de qué cupones fueron consumidos (`applied_coupon`).

### 2. Detalle de Compra: `CartItem` (El Snapshot Fundamental)

Cada línea del ticket recae aquí. Maneja polimorfismo (`item_type`: producto, bono, pack, etc.) para vincular
con IDs originales.

**La Regla del Snapshot Inmutable:** Un error de novato crítico es hacer _join_ constante de la tabla
Productos o Servicios para consultar su precio histórico en una factura. _En sistemas contables, esto es
ilegal._ Si el precio del champú L'Oréal sube hoy de 10€ a 15€ en la BD, un ticket vendido hace un año _no
debe actualizar su total y mostrar que se pagó 15€_.

Para evitar la corrupción, `CartItem` efectúa un Snapshot "foto-calco" blindado en la operación TPV: Copia
permanentemente `name`, `unit_price`, `quantity`, e IVA (`tax_rate`) _en el instante que la transacción pasa a
confirmada_. Calculando un valor rígido y desconectado de futuras variaciones en de catálogo.

---

## 3. Pagos Aplazados: `Debt`

Permite a los clientes fiables pagar de a plazos compras o bonos cuantiosos:

- La tabla `Debt` registra la deuda total (`amount`) asociada al cliente, apuntalando una cantidad
  `remaining`.
- A medida que el cliente hace aportaciones pequeñas, se actualiza la deuda hasta quedar saldada
  (`status: paid`), pudiendo cruzar las inyecciones parciales como mini-carritos paralelos si la
  administración tributaria del país exige factura por ingreso diferido.

---

## 4. Integración Fiscal: Veri\*Factu (AEAT)

Toda la aplicación converge hacia un imperativo legal en España para sistemas de negocio: Generar rastros
inalterables e inmutables verificables mediante código QR remitido a Hacienda. Todo esto vive dentro del
propio `Cart`.

### Estructuración y Prevención de Huecos Numéricos:

- Fijamos `invoice_number` con una nomenclatura controlada (Ej: `BBH-2026-003`). `BBH`=Prefijo empresa,
  `2026`=Ejercicio Fiscal.
- La serie se maneja atómicamente con la tabla **`Sequence`**. El `last_value` actúa de contador para estrujar
  un bloqueo a nivel de transacción PostgreSQL (o emular con MySQL), garantizando que jamás dos peticiones del
  servidor creen facturas paralelas adjudicándose el "Cart Nº 5".

### La Cadena Criptográfica (Hash Encadenado)

Verif\*Factu persigue atar indisolublemente la factura actual, a la factura inmediata anterior, haciendo
imposible (sin ser matemáticamente evidenciable) borrar un ticket borrador a posteriori, como se hacía antaño.

El Cart almacena la firma:

1. **`hash`**: Cadena cifrada combinando emisor, ticket `invoice_number`, fecha, receptor, importe e impuestos
   desglosados, aplicando habitualmente estándar SHA-256 (Opcionalmente HMAC si usa clave secreta).
2. **`previous_hash`**: El hash exacto del carrito F1 o F2 anterior de la serie correlativa (Ej. Cita el hash
   del `BBH-2026-002`).

### El Sello Visible: Código QR

`qr_content`: URL oficial de la agencia tributaria, codificada con los parámetros mínimos exigibles (NIF,
Número de ticket, Total y fecha), listo para ser dibujado visualmente en el frontend usando bibliotecas TPV
para ser impreso en la ticketera (o adjuntado por email de forma ecológica).

### Estado de Envío Automático

- `aeat_status`: Un _Flag_ de máquina de estados (`pending_submission`, `submitted`, `error_retry`). Permite
  programar a futuro un proceso Cron Nocturno mediante Nuxt Nitro Server. El cron repasaría todo Cart
  _submitted=pending_ de ese día, agruparlos de noche y hacer un PUSH automatizado al endpoint de Hacienda,
  limpiando de esfuerzo administrativo contable infinito a las gerencias del salón.
