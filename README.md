# Beils Dashboard (Belleza Honesta)

Panel de administración integral Full-Stack diseñado para centralizar y optimizar las operaciones de **Beils Belleza Honesta**: gestión de clientes, agenda médica/estética, fichas técnicas de tratamientos, TPV y facturación adaptada a la normativa fiscal española (Veri\*Factu / AEAT).

---

## 🛠️ Stack Tecnológico

- **Frontend & Framework:** [Nuxt 4](https://nuxt.com/) (Vue 3, Composition API, Vite 7)
- **Backend Runtime:** Nuxt Nitro Engine con H3 handlers
- **Base de Datos & ORM:** MariaDB gestionada a través de [Prisma 7](https://www.prisma.io/) con `@prisma/adapter-mariadb`
- **Estilos & UI:** [Tailwind CSS v4](https://tailwindcss.com/) + [DaisyUI](https://daisyui.com/) + [Lucide Icons](https://lucide.dev/)
- **Estado & Caché:** [Pinia](https://pinia.vuejs.org/) + [TanStack Vue Query](https://tanstack.com/query/latest)
- **Cumplimiento Legal y Fiscal:** Veri\*Factu (encadenamiento SHA-256, QR fiscal y reporte AEAT), consentimientos informados LGPD con firma digital sobre Canvas y anamnesis médica.

---

## 📦 Módulos Principales

### 1. CRM & Clientes (`/clientes`)
- Expediente unificado por cliente con métricas de asistencia y evolución de gasto.
- Consentimientos informados digitales (LGPD, Láser SHR, Indiba Deep Beauty).
- Captura de firma manuscrita en Canvas con validación de imagen base64.
- Autorizaciones de menores de edad con subida y verificación de documentos de tutores.
- Historial de compras, bonos activos y deudas pendientes.

### 2. Tratamientos & Ficha Técnica
- Control de zonas anatómicas y correlatividad automática de sesiones (1..N).
- Cuestionario de anamnesis de 20 preguntas con semáforo de riesgo clínico (Alto / Bajo / No apto).
- Registro estricto de parámetros técnicos:
  - **Láser SHR:** Fluencia (J/cm²), frecuencia (Hz), disparos totales y fototipo Fitzpatrick.
  - **Indiba Deep Care / Beauty:** Modo capacitivo/resistivo, frecuencia (448 kHz), potencia y tiempo.

### 3. TPV & Facturación (`/ventas`)
- Registro de ventas multicanal (Efectivo, Tarjeta, Bizum, Bono).
- Generación de tickets con numeración fiscal correlativa (`BBH-YYYY-XXXX`) y tickets sintéticos de contingencia.
- Motor de exportación fiscal: desglose por líneas, sumatorios periódicos (día, semana, mes, año, trimestre Q1-Q4) y exportación a CSV/PDF para declaraciones tributarias.
- Módulo Veri\*Factu preparado para firma y envío telemático a la AEAT.

### 4. Agenda & Citas (`/agenda`)
- Visualización de calendario por cabina/profesional y estado de cita.
- Prevención de solapamiento de horarios y vinculación directa al carrito de cobro.

### 5. Catálogo, Bonos y Tarjetas Regalo (`/catalogo`, `/marketing`)
- Catálogo de productos cosméticos y servicios estéticos.
- Venta y consumo de sesiones de bonos individuales o mixtos con descuento.

---

## 🚀 Inicio Rápido

### Requisitos Previos
- **Node.js:** `>= 24.0.0`
- **Gestor de paquetes:** `pnpm` (recomendado `>= 10.0.0`)

### 1. Clonar e Instalar Dependencias
```bash
git clone <url-del-repositorio>
cd beils-belleza-honesta-dashboard
pnpm install
```

### 2. Configurar Variables de Entorno
Copia la plantilla de ejemplo y ajusta tus credenciales de base de datos y claves de API:
```bash
cp .env.example .env
```

### 3. Preparar la Base de Datos
Verifica la conectividad con la instancia MariaDB:
```bash
pnpm db:check
```

Genera el cliente tipado de Prisma:
```bash
pnpm prisma:generate
```

Sincroniza el esquema con la base de datos (o aplica migraciones):
```bash
pnpm db:push
```

*(Opcional)* Si necesitas sembrar datos iniciales o crear el usuario administrador:
```bash
pnpm seed:admin
```

---

## 📜 Scripts Disponibles

| Comando | Descripción |
|---|---|
| `pnpm dev` | Inicia el servidor de desarrollo local en `http://localhost:3000` |
| `pnpm test` | Ejecuta la suite de pruebas unitarias y de dominio (Node Test Runner) |
| `pnpm typecheck` | Comprobación estricta de tipos de TypeScript con `vue-tsc` |
| `pnpm lint` | Análisis estático de código con ESLint |
| `pnpm lint:fix` | Corrección automática de estilos y reglas de ESLint |
| `pnpm db:check` | Prueba de conexión directa contra la base de datos MariaDB remota |
| `pnpm build` | Compila el cliente y servidor Nitro para producción en `.output/` |
| `pnpm preview` | Previsualiza localmente el build de producción |
| `pnpm prisma:generate` | Regenera el cliente tipado de Prisma |
| `pnpm db:push` | Aplica cambios del `schema.prisma` directamente a la base de datos |
| `pnpm tickets:verify` | Auditoría e inspección del estado de tickets, secuencias y puntos de control de agenda |
| `pnpm tickets:sync-agenda` | Simulación (Dry-Run) de sincronización de citas huérfanas con ventas cobradas |
| `pnpm tickets:sync-agenda:apply` | Aplica en vivo la sincronización de citas huérfanas vinculándolas y marcándolas como COMPLETADA |
| `pnpm tickets:migrate` | Simulación (Dry-Run) de resecuenciación correlativa anual de tickets |
| `pnpm tickets:migrate:apply` | Aplica en vivo la resecuenciación correlativa anual de tickets (`0001` a `0390`+) |

---

## 🧾 Migración de Tickets y Sincronización Fiscal (Veri*Factu)

Para mantener la correlatividad fiscal anual (`0001` a `0390`+) y la sincronización estricta entre la Agenda y el TPV, el proyecto incluye herramientas dedicadas (ver guía completa en [ticket_migration_tutorial.md](ticket_migration_tutorial.md)):

### Paso 2 del Procedimiento: Auditoría del Estado de la Base

Antes y después de cualquier sincronización o migración en producción, inspeccione el estado actual de los comprobantes y secuencias:

```bash
pnpm run tickets:verify
```

Este comando audita y reporta:
1. **Secuencias registradas en tabla `sequences`**: Comprueba el valor de `last_value` para la clave unificada `invoice_2026`.
2. **Volumen y rangos por mes**: Verifica que los tickets mantengan continuidad estricta anual sin reseteos erróneos entre meses (ej. `[BBH-03-2026]`, `[BBH-07-2026]`, `[BBH-08-2026]`, `[BBH-09-2026]`, `[BBH-10-2026]`).
3. **Puntos de control según agenda**: Revisa la correlación cronológica de tickets clave contra la hora real de la cita en cabina (desde el primer ticket emitido hasta el último actual).

> 📖 **Guías y Procedimientos:**
> - [Guía de Migración de Tickets y Sincronización de Agenda](docs/tutorial-migracion-tickets.md)
> - [Guía de Subtotales Mensuales en Exportaciones (PDF/CSV)](docs/tutorial-subtotales-reporte-ventas.md)

---

## 🌐 Despliegue en Producción (Plesk / Node.js)

1. Ejecuta la instalación y el build en el servidor:
   ```bash
   pnpm install --frozen-lockfile
   pnpm build
   ```
2. La aplicación incluye `server.cjs` en la raíz como punto de entrada para servidores gestionados (Plesk Passenger / Phusion):
   ```javascript
   import('./.output/server/index.mjs')
   ```
3. Asegúrate de configurar las variables de entorno de producción en el panel de Plesk o en el archivo `.env` del servidor.
