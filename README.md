# Beils Dashboard — Plataforma Integral de Gestión y Facturación Veri*Factu

[![Node Version](https://img.shields.io/badge/Node.js-%3E%3D22.22.3%20%7C%2024.15%20%7C%2026-brightgreen.svg)](https://nodejs.org/)
[![Nuxt Version](https://img.shields.io/badge/Nuxt-4.6.2-00DC82.svg)](https://nuxt.com/)
[![Vue Version](https://img.shields.io/badge/Vue-3.5.44-4FC08D.svg)](https://vuejs.org/)
[![Prisma Version](https://img.shields.io/badge/Prisma-7.10.1-2D3748.svg)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.3.3-38B2AC.svg)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Tests-190%20passed%20(100%25)-success.svg)](file:///tests)
[![Security Hardened](https://img.shields.io/badge/Security-Hardened%20(Fase%201%20%26%202)-blueviolet.svg)](file:///reporte-status-actual-app.md)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)](#)

Panel de administración integral **Full-Stack** diseñado para centralizar, optimizar y blindar operativamente la gestión de **Beils Belleza Honesta**: expediente clínico y CRM de clientela, agenda inteligente multicabina, fichas técnicas de tratamientos médico-estéticos (Láser SHR, Indiba Deep Beauty), TPV omnicanal, gestión avanzada de bonos compartidos y sistema de facturación con encadenamiento criptográfico adaptado a la normativa fiscal española (**Veri\*Factu / AEAT - Real Decreto 1007/2023**).

---

## 📑 Tabla de Contenidos

- [🛠️ Stack Tecnológico](#️-stack-tecnológico)
- [🏛️ Arquitectura del Sistema](#️-arquitectura-del-sistema)
- [📦 Módulos del Sistema](#-módulos-del-sistema)
  - [1. CRM, Clientes & Expediente Digital](#1-crm-clientes--expediente-digital)
  - [2. Tratamientos Médicos, Ficha Técnica & Consentimientos](#2-tratamientos-médicos-ficha-técnica--consentimientos)
  - [3. Agenda Inteligente & Gestión de Cabinas](#3-agenda-inteligente--gestión-de-cabinas)
  - [4. TPV Omnicanal, Facturación & Veri\*Factu](#4-tpv-omnicanal-facturación--verifactu)
  - [5. Bonos, Paquetes & Sistema de Compartición](#5-bonos-paquetes--sistema-de-compartición)
  - [6. Catálogo de Servicios & Cosméticos](#6-catálogo-de-servicios--cosméticos)
  - [7. Business Intelligence & Informes Tributarios](#7-business-intelligence--informes-tributarios)
  - [8. Usuarios, Roles & Control de Acceso (RBAC)](#8-usuarios-roles--control-de-acceso-rbac)
- [🛡️ Blindaje de Seguridad & Cumplimiento Normativo](#️-blindaje-de-seguridad--cumplimiento-normativo)
- [🚀 Inicio Rápido & Configuración Local](#-inicio-rápido--configuración-local)
- [📜 Scripts Disponibles](#-scripts-disponibles)
- [🧾 Operaciones Fiscales & Sincronización de Tickets](#-operaciones-fiscales--sincronización-de-tickets)
- [🧪 Suite de Pruebas Automatizadas](#-suite-de-pruebas-automatizadas)
- [🌐 Despliegue en Producción (Plesk / Phusion Passenger)](#-despliegue-en-producción-plesk--phusion-passenger)
- [📖 Enlaces y Documentación Relacionada](#-enlaces-y-documentación-relacionada)

---

## 🛠️ Stack Tecnológico

El proyecto está construido sobre una arquitectura moderna desacoplada en TypeScript estricto de extremo a extremo:

### Frontend
- **Framework Reactivo:** [Nuxt 4.6.2](https://nuxt.com/) sobre [Vue 3.5.44](https://vuejs.org/) con arquitectura de Composition API (`<script setup lang="ts">`).
- **Motor de Compilación:** [Vite 7.3.1](https://vitejs.dev/) con soporte de SSR y Nitro prerender.
- **Estilos & Diseño:** [Tailwind CSS v4.3.3](https://tailwindcss.com/) + [DaisyUI v5](https://daisyui.com/) configurado con el sistema de tokens corporativo *Gogo Admin*.
- **Iconografía:** [Lucide Vue Next](https://lucide.dev/) (v0.564.0).
- **Animaciones & Micro-interacciones:** [GSAP 3.15](https://greensock.com/gsap/) para transiciones de modales y cajones laterales; composable propio `useSlidingPill` para animaciones tipo *spring*.
- **Gestión de Estado & Caché:**
  - [Pinia 3.0.4](https://pinia.vuejs.org/) para estado reactivo de sesión, carrito TPV y temas visuales.
  - [TanStack Vue Query 5.104](https://tanstack.com/query/latest) para sincronización con el servidor, revalidaciones en segundo plano y prefetching al interactuar sobre filas de datos.
- **Gráficos & Analítica:** [Apache ECharts 6.1.0](https://echarts.apache.org/) y [vue-echarts 8.3.2](https://github.com/ecomfe/vue-echarts).
- **Procesamiento Multimedia:** [vue-advanced-cropper 2.8.9](https://advanced-cropper.github.io/vue-advanced-cropper/) para recorte interactivo de avatares.
- **Internacionalización:** [vue-i18n 11.4.16](https://vue-i18n.intlify.dev/) con soporte para Español (`es`), Inglés (`en`), Polaco (`pl`) y Gallego (`gl`).

### Backend & Capa de Datos
- **Runtime:** Nuxt Nitro Engine con middlewares y API handlers tipados basados en [H3](https://github.com/unjs/h3).
- **Base de Datos:** MariaDB 10.x / 11.x mediante [mariadb 3.5.4](https://github.com/mariadb-corporation/mariadb-connector-nodejs).
- **ORM:** [Prisma 7.10.1](https://www.prisma.io/) utilizando el adaptador nativo `@prisma/adapter-mariadb` con gestión de pool de conexiones optimizado para servidores remotos (Plesk/Hostinger).
- **Validación de Datos en Frontera:** [Zod 4.6.7](https://zod.dev/) con validadores estrictos en cada endpoint que impiden *mass assignment* e inyecciones de parámetros.
- **Procesamiento de Archivos e Imágenes:** [Sharp 0.35.5](https://sharp.pixelplumbing.com/) para recodificación segura a WebP, eliminación de metadatos sensibles (EXIF / GPS) y detección de tipos por *magic bytes*.
- **Integraciones Fiscales & SOAP:** [soap 1.14.0](https://github.com/vpulim/node-soap) para el despacho de remesas telemáticas firmadas con certificado X.509 ante los servicios web de la AEAT.
- **Generación Documental:** [jsPDF 4.2.1](https://github.com/parallax/jsPDF) con tipografías vectoriales embebidas para exportación de consentimientos, presupuestos y reportes trimestrales.

---

## 🏛️ Arquitectura del Sistema

```
beils-belleza-honesta-dashboard/
├── .agents/                    # Agentes de desarrollo y skills (Loop, Maker, Verifier, Memory)
├── app/                        # Capa de Frontend Nuxt / Vue
│   ├── assets/                 # Estilos globales (main.css, variables de tokens Gogo)
│   ├── components/             # Componentes Container/Presentational
│   │   ├── agenda/             # Vistas Day, Grid, Month, Year, BookingDrawer, BookingItemSelector
│   │   ├── clients/            # ProfileHeader, HealthSection, PackagesSection, Bento analytics
│   │   ├── modals/             # Modales animados (Package, Client, Consent, Purchase, etc.)
│   │   ├── sales/              # SalesMetrics, SalesFilters, TPV Cart, ExportModal
│   │   └── ui/                 # Componentes atómicos (AppSelect, ThemeToggle, Loader, etc.)
│   ├── composables/            # Lógica reactiva reutilizable (useBookingForm, useSlidingPill, etc.)
│   ├── pages/                  # Enrutamiento basado en archivos (/clientes, /agenda, /ventas, etc.)
│   └── stores/                 # Stores globales de Pinia (auth, cart, agenda, theme)
├── docs/                       # Guías técnicas y tutoriales paso a paso
├── prisma/                     # Esquema declarativo de base de datos (`schema.prisma`)
├── scripts/                    # Herramientas de mantenimiento operativo y migración
│   ├── check-db.ts             # Comprobación de salud de conexión MariaDB
│   ├── fix-db-tables.ts        # Migración DDL en caliente para tablas y columnas faltantes
│   ├── migrate-ticket-numbers.ts # Resecuenciación anual correlativa de tickets
│   ├── migrate-uploads-private.ts# Migración segura de multimedia fuera de public/
│   ├── sync-bookings-sales.ts  # Vinculación y conciliación de citas con tickets cobrados
│   └── verify-ticket-numbers.ts# Auditoría de secuencias fiscales y puntos de control
├── seeds/                      # Semillas de entorno de desarrollo y bootstrapping admin
├── server/                     # Capa de Backend Nitro
│   ├── api/                    # Endpoints REST (auth, clients, agenda, sales, packages, etc.)
│   ├── middleware/             # Cadena de custodia (rate-limit, auth, security-headers)
│   ├── plugins/                # Extensiones Nitro (sanitizador de errores 5xx de API)
│   └── utils/                  # Lógica de dominio pura (sale-pricing, package-sharing, jwt, etc.)
├── shared/                     # Tipos TypeScript compartidos y DTOs de dominio
└── tests/                      # Suite de pruebas unitarias y de dominio (Node Test Runner)
```

📐 Capas del backend (handler → caso de uso → puerto ← adaptador) y guía para añadir casos de uso: [docs/arquitectura.md](docs/arquitectura.md)

---

## 📦 Módulos del Sistema

### 1. CRM, Clientes & Expediente Digital (`/clientes`, `/clientes/[id]`)
- **Ficha Integral Bento Grid:** Visión ejecutiva 360° del cliente con métricas de fidelización clasificadas por categoría (*Bronce, Plata, Oro VIP*).
- **Gráficos Financieros Históricos:** Distribución de métodos de pago y evolución temporal de gasto (filtros 3M, 6M, 1Y y Todo) renderizados mediante Apache ECharts.
- **Edición Inline Inmediata:** Componentes reactivos para actualizar nombre, datos de contacto y notas clínicas con guardas contra sobreescritura accidental.
- **Timeline de Actividad y Citas:** Historial cronológico con enlaces directos al comprobante de cobro emitido y estado de cada sesión.
- **Buscador con Debounce Desacoplado:** Búsqueda en tiempo real por nombre, teléfono o DNI con botón de borrado inmediato (`X`) y paginación acotada en servidor.

### 2. Tratamientos Médicos, Ficha Técnica & Consentimientos
- **Anamnesis Médica Digital:** Cuestionario clínico de 20 preguntas ponderadas con semáforo de riesgo (*Apto, Precaución, No Apto*) para tratamientos estéticos avanzados.
- **Parámetros Técnicos de Cabina:**
  - **Láser SHR (Diodo):** Control estricto de fototipo Fitzpatrick (I al VI), fluencia en julios ($J/cm^2$), frecuencia ($Hz$) y contador acumulativo de disparos.
  - **Indiba Deep Care / Beauty:** Control de modo (Capacitivo/Resistivo), frecuencia radiofrecuencia (448 kHz), potencia aplicada y tiempo exacto de tratamiento.
- **Consentimientos Informados Digitales (LGPD):**
  - Firma manuscrita capturada en tiempo real mediante HTML5 Canvas con validación criptográfica de formato Base64.
  - Generación instantánea de copia imprimible en PDF con jsPDF.
  - **Autorización de Menores de Edad:** Módulo específico que exige nombre, DNI y documento acreditativo del tutor legal (validador de tamaño máximo 5 MB y extensiones seguras).
  - **Inmutabilidad RGPD:** Los consentimientos firmados son inalterables (retornan código HTTP 409 ante intentos de modificación); las correcciones se efectúan mediante documento de revocación formal.

### 3. Agenda Inteligente & Gestión de Cabinas (`/agenda`)
- **Vistas Multicalendario:**
  - **Vista Diaria (`AgendaDayView`):** Rejilla horaria con posicionamiento visual milimétrico de citas, barras de progreso y estado en tiempo real (*Pendiente, En Curso, Completada, Cancelada*).
  - **Vista Cuadrícula (`AgendaGridView`):** Distribución simultánea por profesionales y cabinas de tratamiento.
  - **Vista Mensual (`AgendaMonthView`) & Anual:** Calendarios interactivos para planificación a medio y largo plazo.
- **Motor de Prevención de Solapamientos:** Validación atómica en backend (`booking-validation.ts`) que impide doble reserva en una misma cabina o con el mismo profesional.
- **Cajón Lateral Interactivo (`BookingDrawer`):** Formulario ergonómico con selector polimórfico de servicios o canje de bonos preexistentes; precarga automática del cliente al agendar desde su ficha.

### 4. TPV Omnicanal, Facturación & Veri\*Factu (`/ventas`, `/tpv`)
- **Cobro Rápido en Mostrador:** Interfaz optimizada para pantallas táctiles con catálogo categorizado, búsqueda rápida y carrito de compra reactivo.
- **Múltiples Métodos de Pago:** Efectivo, Tarjeta física, Bizum, Consumo de Bonos y Pagos aplazados con Stripe.
- **Cálculo de Precios del Lado del Servidor:** Protección rigurosa contra manipulación del cliente (`sale-pricing.ts`); el backend consulta el catálogo para fijar precios unitarios, tasas de IVA y topes máximos de descuento.
- **Gestión de Cuentas por Cobrar (Deudas):** Módulo de pago fraccionado de deudas con comprobación de saldo en base de datos para prevenir *lost updates* bajo concurrencia.
- **Cumplimiento Veri\*Factu (RD 1007/2023):**
  - Generación de numeración fiscal unificada y continua (`BBH-YYYY-XXXX`).
  - Encadenamiento de huellas digitales SHA-256 entre facturas consecutivas.
  - Cliente SOAP preparado para comunicación con los servidores de la Agencia Tributaria (AEAT).

### 5. Bonos, Paquetes & Sistema de Compartición (`/servicios`, `/catalogo`)
- **Contrato Dual de Facturación:**
  - `package_sale`: Venta de un bono desde el TPV que genera la entidad `ClientPackage` asignada al comprador con caducidad predeterminada de 6 meses.
  - `package`: Canje de sesiones acumuladas a importe de 0 € en ticket, descontando el saldo de forma atómica.
- **Consumo Atómico y Concurrente:** Descuento condicionado a saldo suficiente mediante `updateMany` con rollback total de la transacción en caso de saldo insuficiente (protección con tests de carrera).
- **Sistema de Bonos Compartidos (`client_package_shares`):**
  - Permite al titular del bono autorizar a otros clientes registrados como beneficiarios.
  - Reglas de negocio: el bono pertenece al comprador; el consumo automático del TPV prioriza bonos propios; los bonos compartidos solo se deducen tras selección explícita de cabina.

### 6. Catálogo de Servicios & Cosméticos (`/catalogo`, `/servicios`)
- Gestión centralizada de artículos con control de stock, precios de venta, tipo de IVA aplicable y vinculación con marcas, categorías y etiquetas.
- Generación y asignación automática de códigos internos para servicios y paquetes.

### 7. Business Intelligence & Informes Tributarios (`/reportes`, `/overview`)
- **KPIs en Tiempo Real:** Facturación total, ticket medio, tasa de conversión y desglose por canal de cobro.
- **Motor de Exportación Fiscal:**
  - Filtros flexibles por rango temporal (Día, Semana, Mes, Año, Trimestres Q1-Q4 o Histórico completo).
  - Cálculo de bases imponibles desglosadas por tipo de IVA (21%, 10%, 4%, exento).
  - Generación de archivos CSV tabulados y PDF con subtotales mensuales para gestoría y declaraciones de IVA.

### 8. Usuarios, Roles & Control de Acceso (RBAC) (`/usuarios`, `/configuracion`)
- **Modelo de Roles:**
  - `ADMIN`: Control total del sistema, configuración, eliminación de registros, gestión de usuarios y acceso a datos de salud.
  - `STAFF`: Operación de agenda, TPV, ventas e historial de clientes (sin privilegios sobre historial médico ni administración de sistema).
  - `CLIENT`: Perfil de solo lectura sin acceso a la API administrativa.
- **Protección contra Escalada:** Validación estricta con Zod que impide a usuarios no autorizados alterar su propio rol o asignar privilegios elevados.
- **Regla del Último Administrador:** Blindaje que prohíbe eliminar o degradar la cuenta del último administrador del sistema.

---

## 🛡️ Blindaje de Seguridad & Cumplimiento Normativo

El sistema ha superado un proceso exhaustivo de auditoría y *security hardening* (Fases 1, 2, 2b y Bloque A), certificando la resolución de brechas críticas y el cumplimiento estricto del RGPD y de la normativa fiscal:

| Vector de Seguridad | Implementación en Beils Dashboard |
|---|---|
| **Gestión de Sesión** | Cookie `httpOnly; Secure; SameSite=Strict` emitida exclusivamente por el servidor. Invalidación global de sesiones ante cambio de contraseña o rol mediante `token_version`. |
| **Protección contra Fuerza Bruta** | Bloqueo temporal de cuenta al 3º intento fallido de login (15 min iniciales, duplicación progresiva hasta tope de 24 h). Código HTTP `423 Locked`. |
| **Control de Tasa (Rate Limiting)** | Limitador por IP consciente de saltos de proxy inverso (`TRUSTED_PROXY_HOPS`). Máximo 5 peticiones/min en login y 300 peticiones/min globales con respuesta `429 Too Many Requests`. |
| **Almacenamiento de Multimedia Privado** | Subidas reubicadas fuera de `public/uploads/` hacia un directorio privado. Servicio autenticado a través de `/api/files/*` exclusivo para personal autorizado. |
| **Sanitización de Archivos** | Inspección de firmas binarias (*magic bytes*) descartando scripts maliciosos (SVG, HTML). Conversión forzosa de imágenes a WebP mediante Sharp con eliminación de metadatos EXIF y GPS. |
| **Protección contra Fuga de Datos (PII)** | Erradicación total de logs en rutas de desarrollo. Ofuscación de errores 5xx en respuestas de la API mediante hook centralizado en Nitro. |
| **Tipografía Principal & RGPD** | Tipografía **Roboto** definida como fuente principal del dashboard (con *Mulish* como respaldo), auto-alojadas localmente mediante `@nuxt/fonts` bajo `/_fonts` con descarga en tiempo de compilación para garantizar el cumplimiento del RGPD (cero telemetría hacia servidores externos). |
| **Cabeceras HTTP de Seguridad** | Inyección de `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` y `Content-Security-Policy` (CSP). |

---

## 🚀 Inicio Rápido & Configuración Local

### Requisitos del Sistema
- **Node.js:** `>= 22.22.3`, `>= 24.15.0` o `>= 26.0.0` (recomendado: Node 26 LTS o 24 LTS).
- **Gestor de Paquetes:** `pnpm` (`>= 10.0.0`) o `npm`.
- **Base de Datos:** Instancia accesible de MariaDB 10.5+.

### 1. Clonar el Repositorio
```bash
git clone <url-del-repositorio>
cd beils-belleza-honesta-dashboard
```

### 2. Instalar Dependencias
```bash
pnpm install
```

### 3. Configurar Variables de Entorno
Copia la plantilla y define los secretos de tu entorno:
```bash
cp .env.example .env
```

Parámetros clave en el archivo `.env`:
```env
# Base de Datos MariaDB
DATABASE_URL="mariadb://usuario:password@host:3306/beils_db?connection_limit=10"

# Seguridad y Autenticación
JWT_SECRET="clave-secreta-aleatoria-de-minimo-32-caracteres"
TRUSTED_PROXY_HOPS=1
CSP_ENFORCE=false

# Almacenamiento de Archivos Privados
UPLOADS_DIR="./.data/uploads"

# Semillas de Inicialización (Opcional)
SEED_ADMIN_EMAIL="admin@beils.es"
SEED_ADMIN_PASSWORD="TuPasswordSeguro123!"
```

### 4. Inicializar y Verificar la Base de Datos
Comprueba la conectividad de red y credenciales:
```bash
pnpm db:check
```

Genera el cliente tipado de Prisma:
```bash
pnpm prisma:generate
```

Aplica el esquema y las columnas de hardening:
```bash
pnpm db:push
pnpm db:fix
```

*(Opcional)* Si es la primera instalación, inicializa el usuario administrador:
```bash
pnpm seed:admin
```

### 5. Iniciar Servidor de Desarrollo
```bash
pnpm dev
```
La aplicación estará disponible en `http://localhost:3000`.

---

## 📜 Scripts Disponibles

| Script | Descripción |
|---|---|
| `pnpm dev` | Inicia el entorno de desarrollo local con Hot Module Replacement (HMR). |
| `pnpm build` | Genera los artefactos tipados de Prisma y compila el bundle de producción en `.output/`. |
| `pnpm preview` | Ejecuta localmente el servidor compilado de producción para pruebas de pre-despliegue. |
| `pnpm test` | Ejecuta la suite completa de pruebas unitarias y de dominio (190 pruebas). |
| `pnpm typecheck` | Comprueba de forma estricta los tipos de TypeScript en toda la aplicación con `vue-tsc`. |
| `pnpm lint` | Analiza el código fuente con las reglas de ESLint configuradas. |
| `pnpm lint:fix` | Corrige automáticamente discrepancias de estilo y formato en el código. |
| `pnpm db:check` | Prueba de diagnóstico de conexión y pool contra la base de datos MariaDB. |
| `pnpm db:fix` | Migración DDL para garantizar la existencia de columnas de seguridad (`failed_login_count`, `locked_until`, `token_version`) y la tabla `client_package_shares`. |
| `pnpm prisma:generate` | Regenera el cliente tipado de Prisma (`@prisma/client`). |
| `pnpm db:push` | Sincroniza directamente los cambios de `schema.prisma` en la base de datos. |
| `pnpm seed:admin` | Crea de forma idempotente la cuenta del usuario administrador. |
| `pnpm uploads:migrate` | Simulación (Dry-Run) de migración de archivos multimedia desde `public/uploads/` hacia la carpeta privada. |
| `pnpm uploads:migrate:apply` | Ejecuta la migración física de archivos y reescribe las URLs en la base de datos. |
| `pnpm tickets:verify` | Audita secuencias de tickets fiscales y valida la coherencia temporal de la agenda. |
| `pnpm tickets:migrate` | Simulación (Dry-Run) de resecuenciación correlativa anual de tickets (`0001` a `0390`+). |
| `pnpm tickets:migrate:apply` | Aplica en vivo la resecuenciación fiscal anual de tickets. |
| `pnpm tickets:sync-agenda` | Simulación de vinculación entre citas huérfanas y ventas cobradas. |
| `pnpm tickets:sync-agenda:apply` | Vincula y marca como COMPLETADAS las citas huérfanas con ticket de cobro emitido. |

---

## 🧾 Operaciones Fiscales & Sincronización de Tickets

Para garantizar la continuidad anual de comprobantes requerida por el reglamento de facturación, el repositorio cuenta con herramientas de auditoría y corrección. **Son migraciones puntuales: no se ejecutan en cada despliegue.** Solo se corren si la auditoría lo indica, y siempre con un respaldo completo de la base previo.

```bash
# 1. Auditar secuencias y puntos de control cronológicos (solo lectura)
pnpm run tickets:verify

# 2. Solo si hay discontinuidades: simular la resecuenciación (no cambia nada)
pnpm run tickets:migrate

# 3. Solo después de revisar la simulación: aplicar la resecuenciación
pnpm run tickets:migrate:apply

# 4. Solo si la auditoría reporta citas huérfanas: simular y luego aplicar
pnpm run tickets:sync-agenda
pnpm run tickets:sync-agenda:apply
```

Procedimiento detallado: [docs/tutorial-migracion-tickets.md](docs/tutorial-migracion-tickets.md).

> 📖 **Procedimientos Operativos Detallados:**
> - [Guía de Migración de Tickets y Conciliación con Agenda](file:///docs/tutorial-migracion-tickets.md)
> - [Guía de Subtotales Mensuales e Informes de Gestoría](file:///docs/tutorial-subtotales-reporte-ventas.md)
> - [Manual de Migración de Tickets Raíz](file:///ticket_migration_tutorial.md)

---

## 🧪 Suite de Pruebas Automatizadas

El proyecto dispone de **190 pruebas automáticas** agrupadas en 24 suites ejecutadas con el *Node Test Runner* nativo de alta velocidad, garantizando la estabilidad de las reglas de negocio críticas:

```bash
# Ejecutar todas las pruebas unitarias
pnpm test
```

### Cobertura de Pruebas Principales:
- `package-consumption.test.ts`: Pruebas de concurrencia y carreras al consumir bonos simultáneos.
- `treatment-sessions.test.ts`: Reglas clínicas de sesiones de Láser SHR e Indiba Deep Beauty.
- `sales-export.test.ts`: Cálculos fiscales de bases imponibles, IVA y desglose por trimestres.
- `sale-pricing.test.ts`: Verificación de precios en catálogo del lado del servidor.
- `upload-policy.test.ts`: Detección por *magic bytes*, sanitización de rutas y bloqueo de scripts.
- `login-lockout.test.ts` & `rate-limit.test.ts`: Políticas de bloqueo y control de tasa tras proxies.
- `security-headers.test.ts`: Cabeceras HTTP de seguridad e inmutabilidad de consentimientos firmados.

---

## 🌐 Despliegue en Producción (Plesk / Phusion Passenger)

La aplicación se despliega en servidores Plesk (Linux) con Phusion Passenger sobre Node.js. El repositorio incluye `server.cjs` como puente hacia la salida compilada de Nitro.

**Resumen del flujo:**

1. Node.js 22.22.3+, 24.15+ o 26+ asignado al dominio, con archivo de inicio `server.cjs`.
2. Variables de entorno en `/httpdocs/.env` (`JWT_SECRET` es obligatorio en producción).
3. `pnpm install --frozen-lockfile` y `pnpm build`.
4. `pnpm db:fix` **antes** de reiniciar, o fallan las ventas.
5. Reiniciar la aplicación desde el panel o con `touch tmp/restart.txt`.

📘 **Tutorial completo, paso a paso, con tabla de configuración, variables y solución de problemas:** [docs/tutorial-despliegue-plesk.md](docs/tutorial-despliegue-plesk.md)

---

## 📖 Enlaces y Documentación Relacionada

- [Registro Completo de Cambios y Funcionalidades](file:///CHANGELOG.md)
- [Reporte de Estado y Auditoría de Seguridad](file:///reporte-status-actual-app.md)
- [Guía de Migración de Tickets y Sincronización](file:///docs/tutorial-migracion-tickets.md)
- [Tutorial de Subtotales y Reportes de Ventas](file:///docs/tutorial-subtotales-reporte-ventas.md)

---
© 2026 Beils Belleza Honesta · Desarrollado con excelencia técnica y arquitectura limpia.
