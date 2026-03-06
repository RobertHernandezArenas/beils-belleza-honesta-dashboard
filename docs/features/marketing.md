# Marketing y Fidelización

El módulo de Marketing en Beils Dashboard agrupa las herramientas orientadas a maximizar la recurrencia de los
clientes (LTV - Lifetime Value) y atraer nuevo negocio mediante incentivos económicos directos.

El ecosistema se divide principalmente en tres herramientas estratégicas:

1. Cupones de Descuento
2. Bonos de Sesiones
3. Tarjetas Regalo (Giftcards)

---

## 1. Cupones de Descuento (`Coupon`)

Un código promocional (`code`) que el cliente o el recepcionista puede introducir en el momento del pago (TPV)
para abaratar el total de la compra.

### Reglas de Configuración

- **Tipología (`discount_type`):**
   - `fixed`: Desconteo absoluto (Ej: 10€ menos sobre el total).
   - `percentage`: Desconteo relativo (Ej: 15% de descuento).
- **Condiciones Limitantes:**
   - `min_purchase`: Umbral de gasto necesario para que el cupón despierte (Ej: Solo válido en compras
     superiores a 50€).
   - `max_uses`: Tope global de canjes en el sistema (Ej: Los primeros 100 clientes). `current_uses` ejerce de
     track record.
- **Fechas de Vida:**
   - `valid_from` y `valid_until`: Ventana temporal en la que es admitido, permitiendo crear, por ejemplo,
     promociones especiales para el "Black Friday" 2026 configuradas la semana previa.

### Efecto Cíclico en Ventas:

El cupón se guarda en la tabla del carrito TPV (`Cart.applied_coupon`). A su vez, internamente el sistema
prorrateará el valor devengado en las líneas del ticket si la normativa contable así lo dictaminase, para
asegurar que el % del IVA declarado refleje la cuantía neta que _efectivamente_ el negocio recibió.
(Despreciando el regalo).

---

## 2. Bonos de Servicios Pre-comprados (`Bonus` y `ClientBonus`)

Los bonos son el mecanismo de retención más potente del salón de belleza. Prometen un precio ventajoso a
cambio de comprar paquetes por volumen por adelantado.

### ¿Qué compone un Bono Base (`Bonus`)?

Es una "plantilla" de venta configurada por administración:

- Asociada a un único servicio madre puntual (`service_id`).
- Pre-establece un paquete cerrado de sesiones `total_sessions` (Ej: 6 Sesiones de Presoterapia).
- Asigna un precio rompedor frente la unitaria del catálogo original.

### El Bono Adquirido (`ClientBonus`)

Cuando se efectúa una venta en el TPV y un cliente incorpora el "Pack/Bono 6 Sesiones" a su carrito
transaccionado, el sistema TPV escucha el evento "Pagado" y hace _spawner_ de un nuevo registro dentro de la
base de datos vinculado directa o indirectamente al modelo Cliente Final.

- **Rastreo Activo:** `remaining_sessions` arranca en el valor dictado por el bono (e.g. 6). Cada vez que el
  cliente pise el salón, el recpcionista aplicará una bajada (-1) percutiendo en la BD.
- **Prescripción (Opcional):** El `ClientBonus` puede dotarse de una "Fecha Expiratoria" tras su adición
  (caducidad legal a los "12 meses"), promoviendo urgencia al retorno.

---

## 3. Monederos / Tarjetas Regalo (`Giftcard`)

Una tarjeta regalo inyecta liquidez en cuenta bancaria antes de entregar el valor estético, creando deuda
latente u "obligación de servicio póstumo".

### Lógica Transaccional

1. **Emisión:** Un individuo transacciona en POS y abona los 50€ (Pagando preferiblemente en efectivo o
   tarjeta). Nuxt engendra el JWT o Código alfanumérico Hash `Giftcard`.
2. **Saldos Vivo:** `initial_balance` es el PVP de creación. `current_balance` arranca parejo, pero decrece
   parcialmente al canjearse en futuros TPV hasta agotarlo, sin caducar de repente.
3. **Condición Legal AEAT Veri\*Factu:** De acuerdo a la jurisprudencia española moderna referetne al TPV, no
   debe declararse el Impuesto (IVA) en el día de la "Venta de la Moneda / Giftcard", porque a priori no
   sabemos qué IVA tendrá el futuro servicio que ese cliente elija el año próximo. **A la venta del Monedero
   se emite Recibo de Pago No Computable o Ticket con IVA 0% (Provisión de Fondos).** Verdadera factura AEAT
   florece el día de la cita canje.
