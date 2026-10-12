# Guía Paso a Paso: Sincronización de Agenda y Migración de Tickets Correlativos

Este documento detalla el procedimiento técnico y operativo para normalizar la serie de facturación/tickets del salón, garantizando correlatividad fiscal anual (`0001` a `0390`+), orden cronológico estricto según la agenda y sincronización bidireccional en tiempo real entre la Agenda y el TPV.

---

## 1. Fundamentos Arquitectónicos

### 1.1 Estructura del Identificador Fiscal
Cada ticket sigue la nomenclatura estándar:
$$\text{BBH-}\{\text{MES}\}\text{-}\{\text{AÑO}\}\text{-}\{\text{SECUENCIA\_4\_DÍGITOS}\}$$

* **Prefijo institucional**: `BBH` (Beils Belleza Honesta).
* **Mes (`MM`)**: Representa el mes cronológico real de la cita o venta (`03`, `07`, `08`, `09`, `10`).
* **Año (`YYYY`)**: Año de ejercicio fiscal (`2026`).
* **Secuencia anual continua (`XXXX`)**: Contador monótono anual sin reseteo mensual (`0001`, `0002`, ..., `0390`, `0391`, ...).

### 1.2 Reglas Críticas del Sistema
1. **Agenda como Fuente de la Verdad**: Toda venta cobrada debe estar vinculada a su respectiva cita (`cart.booking_id = booking.booking_id`).
2. **Estado Efectivo Garantizado**: Cualquier cita que cuente con un ticket o factura cobrada debe tener estado `COMPLETADA`.
3. **Blindaje de Citas Facturadas**: El sistema bloquea la eliminación (`DELETE`) o cancelación/marcado ausente (`PUT`) de cualquier cita con factura emitida.
4. **Emisión Atómica en Vivo**: El servidor (`server/utils/verifactu.ts`) incrementa de forma transaccional el registro `invoice_2026` en la tabla `sequences`.

---

## 2. Requisitos Previos y Herramientas

Asegúrese de contar con:
* Node.js v20+ o v24+.
* Gestor de paquetes `pnpm`.
* Acceso a la base de datos MariaDB/MySQL (variables de entorno en `.env`).
* Los scripts del repositorio en [package.json](file:///c:/Users/VENOM/Repositorio/beils-belleza-honesta-dashboard/package.json):
  * `pnpm run tickets:verify`
  * `pnpm run tickets:sync-agenda`
  * `pnpm run tickets:sync-agenda:apply`
  * `pnpm run tickets:migrate`
  * `pnpm run tickets:migrate:apply`

---

## 3. Procedimiento de Ejecución Paso a Paso

### Paso 0: Respaldo Completo de la Base de Datos (Obligatorio)
Antes de ejecutar cualquier modificación en producción, genere una copia de seguridad:

```bash
mysqldump -u <usuario> -p <nombre_base_datos> > backup_pre_migracion_$(date +%Y%m%d_%H%M%S).sql
```

---

### Paso 1: Desplegar el Código en el Servidor
Asegúrese de contar con la última versión del código con los scripts y parches de reactividad:

```bash
git pull origin Development  # o la rama principal configurada
pnpm install
```

Archivos clave involucrados:
* [server/utils/verifactu.ts](file:///c:/Users/VENOM/Repositorio/beils-belleza-honesta-dashboard/server/utils/verifactu.ts): Clave unificada anual `invoice_2026`.
* [server/api/sales/carts/index.ts](file:///c:/Users/VENOM/Repositorio/beils-belleza-honesta-dashboard/server/api/sales/carts/index.ts): Auto-enlace de citas con tolerancia de fecha.
* [server/api/agenda/bookings/index.ts](file:///c:/Users/VENOM/Repositorio/beils-belleza-honesta-dashboard/server/api/agenda/bookings/index.ts): Consulta de citas con relación `carts` y estado efectivo.
* [server/api/agenda/bookings/[id].ts](file:///c:/Users/VENOM/Repositorio/beils-belleza-honesta-dashboard/server/api/agenda/bookings/%5Bid%5D.ts): Protección contra eliminación o cancelación de citas facturadas.
* [app/composables/useTpv.ts](file:///c:/Users/VENOM/Repositorio/beils-belleza-honesta-dashboard/app/composables/useTpv.ts): Emisión de `REFRESH_BOOKINGS` e invalidación de caché.
* [app/composables/useAgenda.ts](file:///c:/Users/VENOM/Repositorio/beils-belleza-honesta-dashboard/app/composables/useAgenda.ts): Escucha en tiempo real vía `useSync`.

---

### Paso 2: Auditoría Inicial del Estado de la Base
Inspeccione el estado actual de los tickets y secuencias registradas:

```bash
pnpm run tickets:verify
```

Verifique:
* Total de tickets con factura emitidos.
* Secuencias registradas en la tabla `sequences`.

---

### Paso 3: Sincronizar Citas Huérfanas con sus Ventas
Muchas ventas históricas generadas en el TPV no tenían asignado el `booking_id`, dejando las citas de la agenda en estado `PENDIENTE`.

1. **Simular la reconciliación (Dry-Run)**:
   ```bash
   pnpm run tickets:sync-agenda
   ```
   *Revise la cantidad de ventas huérfanas que coinciden con citas del mismo cliente y fecha.*

2. **Aplicar la reconciliación en vivo**:
   ```bash
   pnpm run tickets:sync-agenda:apply
   ```
   *Este comando vincula `cart.booking_id = booking.booking_id` y actualiza las citas a `COMPLETADA`.*

---

### Paso 4: Simulación de Resecuenciación de Tickets (Dry-Run)
Ejecute el script de migración en modo simulación:

```bash
pnpm run tickets:migrate
```

El script verificará:
* Ordenamiento estricto por `created_at ASC` (fecha y hora de cita).
* Corrección de tickets con mes erróneo (por ejemplo, `BBH-08-2026-0001` emitido el 1 de julio pasa a `BBH-07-2026-0177`).
* Continuidad correlativa estricta sin reseteos mensuales.

---

### Paso 5: Aplicar la Migración Definitiva de Tickets
Ejecute la migración en vivo sobre la base de datos:

```bash
pnpm run tickets:migrate:apply
```

#### ¿Qué hace internamente este comando?
1. **Fase 1 (Prefijos temporales)**: Asigna a los tickets números transitorios (`TEMP-...`) para evitar errores de colisión de unicidad (`Duplicate entry`) en MariaDB cuando dos tickets intercambian posición.
2. **Fase 2 (Asignación definitiva)**: Asigna el nuevo identificador correlativo (`BBH-<mes>-2026-<secuencia>`) y regenera el contenido de la cadena QR VeriFactu.
3. **Fase 3 (Actualización de secuencias)**: Actualiza `invoice_2026` con el valor exacto del último ticket emitido (ej. `390`) y elimina las claves mensuales obsoletas (`invoice_2026_07`, `invoice_2026_08`, etc.).

---

### Paso 6: Verificación y Auditoría Final
Compruebe que la base de datos quedó en perfecto estado:

```bash
pnpm run tickets:verify
```

Debe validar los siguientes puntos de control:

| Punto de Control | Fecha / Hora | Identificador Final | Cliente |
| :--- | :--- | :--- | :--- |
| **Primer Ticket** | 17/Mar/2026 16:56 | `BBH-03-2026-0001` | Ana Rabuñal |
| **Último Marzo** | 26/Mar/2026 10:17 | `BBH-03-2026-0014` | Malele Male |
| **Inicio Julio** | 26/Mar/2026 12:27 | `BBH-07-2026-0015` | Begoña Beg |
| **01/Julio Corregido** | 01/Jul/2026 11:07 | `BBH-07-2026-0177` | Cliente No Registrado |
| **Cierre Julio** | 31/Jul/2026 16:55 | `BBH-07-2026-0245` | Pilar Cancela |
| **Inicio Agosto** | 03/Ago/2026 10:44 | `BBH-08-2026-0246` | Carmen Suárez |
| **Cierre Agosto** | 31/Ago/2026 17:17 | `BBH-08-2026-0310` | Sara Sara |
| **Inicio Septiembre** | 01/Sep/2026 15:42 | `BBH-09-2026-0311` | Carmen Suárez |
| **Cita 30/Sep 12:30** | 30/Sep/2026 10:30 | `BBH-09-2026-0375` | Kathryn McCrary |
| **Cierre Septiembre** | 30/Sep/2026 17:05 | `BBH-09-2026-0376` | Pilar Pardo |
| **Inicio Octubre** | 01/Oct/2026 10:01 | `BBH-10-2026-0377` | Inca Hospital |
| **Último Ticket Global** | 08/Oct/2026 18:50 | `BBH-10-2026-0390` | María Inditex |

*El próximo ticket que se emita en caja será automáticamente el **`BBH-10-2026-0391`**.*

---

### Paso 7: Ejecución de la Suite de Pruebas
Compruebe que todas las reglas de negocio, filtros fiscales y cálculos se mantienen íntegros:

```bash
pnpm test
```
*Los 38 tests automatizados deben completarse con 0 errores.*

---

### Paso 8: Reinicio del Servicio de Aplicación
Reinicie el proceso Node.js (vía PM2 o Plesk Node.js Manager) para asegurar que el nuevo generador en vivo de VeriFactu y los manejadores de eventos se encuentren cargados en memoria:

```bash
pm2 restart beils-dashboard  # O reiniciar desde el panel Plesk
```

---

## 4. Preguntas Frecuentes y Diagnóstico

### ¿Por qué se debe usar el proceso en 2 fases (`TEMP-`)?
En bases de datos relacionales, la columna `invoice_number` cuenta con un índice `@unique`. Si el script intenta renombrar el ticket `0176` a `0177` mientras el `0177` original todavía existe, la base de datos abortará la transacción con error `Duplicate entry`. Asignar primero prefijos temporales (`TEMP-...`) libera todos los valores del rango antes de asignar los definitivos.

### ¿Qué ocurre si se cobra una venta en una pestaña del navegador con la agenda abierta en otra?
El composable [useTpv.ts](file:///c:/Users/VENOM/Repositorio/beils-belleza-honesta-dashboard/app/composables/useTpv.ts) emite un evento `REFRESH_BOOKINGS` mediante `BroadcastChannel`. La pestaña de la agenda escucha el evento mediante `useSync` e invalida de inmediato la caché de Vue Query (`queryKey: ['bookings']`), actualizando el estado de la cita en pantalla sin necesidad de recargar la página.
