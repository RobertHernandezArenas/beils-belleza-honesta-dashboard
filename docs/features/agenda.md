# Agenda y Citas (Bookings)

El módulo Agenda es el corazón operativo diario del salón. Coordina el cruce de tres variables clave:
Clientes, Empleados (Staff) y Servicios/Packs a prestar.

---

## Modelo Central: `Booking`

A través del modelo `Booking` (Cita) establecemos la "promesa" de un servicio puntual:

### 1. Actores Involucrados

- **`client_id`**: El usuario (Client) que solicita el servicio.
- **`staff_id`**: El usuario (Staff/Profesional) asignado para realizarlo. Este cruce permite construir
  interfaces de "calendarios paralelos" donde se puede ver qué hace cada empleado.

### 2. El Contenido de la Cita (`item_type` e `item_id`)

Como Beils Dashboard es flexible, un cliente puede reservar un _Servicio Aislado_ o un _Pack Completo_.

- `item_type`: String polimórfico (`'service'` o `'pack'`).
- `item_id`: El UUID que apunta a esa entidad física de negocio.

### 3. La Dimensión Temporal

- `booking_date`: La fecha concreta de la cita.
- `start_time` y `end_time`: Formatos simplificados como "10:00" o "10:45".
- `duration`: Minutos absolutos. Aunque matemáticamente predecible con las horas anteriores, guardar
  `duration` acelera las validaciones de "solapamiento" en el backend (ej. evitar que el empleado "A" tenga
  dos clientes a las 10:00).

### 4. Ciclo de Vida (`status`)

Las citas no se borran; transitan un estado:

- `pending`: Solicitada, pero no confirmada tácitamente.
- `confirmed`: El salón asume la asistencia.
- `completed`: Se atendió al cliente (Suele dar paso a la creación de un _Carrito_ / Factura).
- `cancelled`: Anulada por antelación u otro motivo sin peso contable.
- `no_show`: El cliente no se presentó. Útil para penalizaciones o estadísticas de confianza (`scoring`).

---

## Validación Crítica de Back-End: Solapamientos

El punto más complejo del módulo es asegurar que **no haya overbooking accidental**. Todo endpoint
`POST /api/bookings` o `PUT /api/bookings` DEBE realizar una validación cruzada antes de interactuar con
Prisma.

### Algoritmo de Guardia de Colisiones

1. **Parámetros:** Fecha deseada, hora inicial, tiempo de duración _esperado_ (extraído de la BD vinculando el
   campo `duration` del servicio solicitado).
2. **Cálculo:** `horaLibre = horaInicial + tiempoDuracion`.
3. **Chequeo de Personal:** ¿El empleado (`staff_id`) está de turno?
4. **Colisión Cita:** Consultar en BD si para esa `booking_date` y el mismo `staff_id`, existen citas activas
   que estén entre `start_time <= horaElegida < end_time` o `start_time < horaLibre <= end_time`.
5. **Rebote Elegante:** Si choca, retornar respuesta HTTP `409 Conflict` alertando qué hueco colisiona.
