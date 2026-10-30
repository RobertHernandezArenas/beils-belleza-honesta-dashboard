# Registro de Cambios (CHANGELOG) — Beils Dashboard

Todos los cambios notables, hitos arquitectónicos, nuevas funcionalidades, refactorizaciones y correcciones de seguridad implementadas en **Beils Belleza Honesta Dashboard** desde el primer commit hasta el estado actual del repositorio se encuentran documentados exhaustivamente en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y se adhiere a la filosofía de [Semantic Versioning](https://semver.org/lang/es/).

---

## 📊 Métricas Globales del Repositorio

- **Total de Commits Registrados:** 302 commits trazados desde el commit inicial `f879b32` (28/02/2026) hasta `14629a0` (25/10/2026).
- **Periodo de Desarrollo:** Febrero 2026 – Octubre 2026 (9 meses de desarrollo iterativo continuo).
- **Cobertura de Pruebas Automatizadas:** 190 tests (100% aprobados) distribuidos en 24 suites de pruebas de dominio, seguridad y reglas de negocio.
- **Auditoría de Seguridad y Hardening:** 15 vulnerabilidades críticas/altas resueltas (Fases 1, 2, 2b y Bloque A) documentadas en `reporte-status-actual-app.md`.
- **Cumplimiento Normativo:** Veri*Factu (RD 1007/2023 - AEAT), RGPD / LOPDGDD (Firma digital biométrica en canvas, inmutabilidad de consentimientos, privatización de almacenamiento de multimedia).

---

## 🗂️ Índice de Contenidos

1. [🏛️ Segmentación Temática por Módulos de Negocio](#-segmentación-temática-por-módulos-de-negocio)
   - [Módulo 1: Autenticación, Seguridad Perimetral & RBAC](#módulo-1-autenticación-seguridad-perimetral--rbac)
   - [Módulo 2: CRM, Ficha 360° & Expediente Clínico de Clientes](#módulo-2-crm-ficha-360-expediente-clínico-de-clientes)
   - [Módulo 3: Tratamientos Estéticos, Fichas Técnicas & Consentimientos Digitales](#módulo-3-tratamientos-estéticos-fichas-técnicas--consentimientos-digitales)
   - [Módulo 4: Agenda Inteligente Multicabina & Motor de Citas](#módulo-4-agenda-inteligente-multicabina--motor-de-citas)
   - [Módulo 5: TPV Omnicanal, Carrito & Facturación Veri*Factu](#módulo-5-tpv-omnicanal-carrito--facturación-verifactu)
   - [Módulo 6: Bonos, Paquetes de Sesiones & Sistema de Compartición](#módulo-6-bonos-paquetes-de-sesiones--sistema-de-compartición)
   - [Módulo 7: Catálogo de Servicios, Cosméticos & Gestión de Marcas](#módulo-7-catálogo-de-servicios-cosméticos--gestión-de-marcas)
   - [Módulo 8: Business Intelligence, Analítica Financiera & Exportación Fiscal](#módulo-8-business-intelligence-analítica-financiera--exportación-fiscal)
   - [Módulo 9: Arquitectura de Datos MariaDB, Conexión Plesk & DevOps](#módulo-9-arquitectura-de-datos-mariadb-conexión-plesk--devops)
2. [📅 Cronología Detallada por Hitos y Versiones (Commits 1 al 302)](#-cronología-detallada-por-hitos-y-versiones)
   - [v2.0.0 — Gran Hardening de Seguridad, Bonos Compartidos & RGPD (Octubre 2026)](#v200--gran-hardening-de-seguridad-bonos-compartidos--rgpd-octubre-2026)
   - [v1.5.0 — Correlatividad Anual de Tickets, Conciliación de Citas & Migración DDL (Octubre 2026)](#v150--correlatividad-anual-de-tickets-conciliación-de-citas--migración-ddl-octubre-2026)
   - [v1.4.0 — Agentes de Desarrollo, Consentimientos Avanzados & BI Fiscal (Septiembre 2026)](#v140--agentes-de-desarrollo-consentimientos-avanzados--bi-fiscal-septiembre-2026)
   - [v1.3.0 — Sistema de Bonos/Paquetes, Diseño Gogo Admin & Tipado TypeScript Estricto (Agosto 2026)](#v130--sistema-de-bonospaquetes-diseño-gogo-admin--tipado-typescript-estricto-agosto-2026)
   - [v1.2.0 — BookingDrawer, Servidor MCP Excalidraw, Conexión Plesk & Rendimiento (Julio 2026)](#v120--bookingdrawer-servidor-mcp-excalidraw-conexión-plesk--rendimiento-julio-2026)
   - [v1.1.0 — Consolidación de Agenda, Patrones GoF & Animaciones GSAP (Abril – Junio 2026)](#v110--consolidación-de-agenda-patrones-gof--animaciones-gsap-abril--junio-2026)
   - [v1.0.0 — Fundación de la Plataforma, Catálogo, TPV Inicial & Veri*Factu Base (Febrero – Marzo 2026)](#v100--fundación-de-la-plataforma-catálogo-tpv-inicial--verifactu-base-febrero--marzo-2026)
3. [📋 Registro Exhaustivo de Todos los Commits (1 a 302)](#-registro-exhaustivo-de-todos-los-commits)

---

## 🏛️ Segmentación Temática por Módulos de Negocio

Esta sección desglosa las capacidades técnicas de la plataforma agrupadas por subsistemas funcionales:

### Módulo 1: Autenticación, Seguridad Perimetral & RBAC
- **Modelo de Control de Acceso Basado en Roles (RBAC):** Implementación de roles diferenciados (`ADMIN`, `STAFF`, `CLIENT`) con verificación estricta en middleware (`server/middleware/auth.ts` y `server/utils/api-access.ts`).
- **Eliminación de Escalada de Privilegios:** Protección de endpoints administrativos (`/api/users`) mediante `requireAdmin` y esquemas Zod con `.strict()` para impedir sobreescritura de campos sensibles (`role`, `user_id`, `refresh_token`).
- **Protección de Sesión & Cookies:** Emisión de cookies `httpOnly`, `Secure` y `SameSite=Strict` desde el servidor Nitro; supresión total de almacenamiento de tokens o credenciales en `localStorage` del navegador.
- **Revocación Global de Sesiones:** Sistema de invalidación inmediata mediante `token_version` en la tabla `User`; cualquier cambio de contraseña, rol o baja de usuario invalida instantáneamente todas las sesiones activas en un máximo de 30 segundos de caché.
- **Protección contra Fuerza Bruta & Bloqueo de Cuenta:** Bloqueo temporal automático tras 3 intentos fallidos de autenticación (15 minutos iniciales con duplicación exponencial hasta un máximo de 24 horas); respuesta HTTP 423 con contador atómico en MariaDB y desbloqueo manual reservado para administradores.
- **Control de Tasa (Rate Limiting) Consciente de Proxy:** Resolución precisa de la IP real del cliente respetando saltos de proxy inverso configurables (`TRUSTED_PROXY_HOPS`); límite de 5 logins/min por IP y 300 peticiones/min generales con cabeceras estándar `Retry-After`.
- **Criptografía Robusta:** Hashing de contraseñas mediante `bcryptjs` con coste de trabajo 12; firma de tokens JWT fijada en `HS256` con verificación de longitud mínima obligatoria de 32 bytes (`server/utils/jwt-secret.ts`).
- **Cabeceras HTTP de Seguridad & CSP:** Inyección automática de cabeceras de endurecimiento: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` y `Content-Security-Policy` en modo Report-Only (configurable a estricto con `CSP_ENFORCE=true`).

### Módulo 2: CRM, Ficha 360° & Expediente Clínico de Clientes
- **Estructura Bento Grid 2027:** Panel interactivo modular con métricas clave de cliente (visitas totales, gasto acumulado, ticket medio, tasa de asistencia).
- **Segmentación Dinámica de Clientela:** Algoritmo de clasificación automática en tres niveles de fidelidad: *Bronce* (<65%), *Plata* (65%-89%) y *Oro VIP* (≥90%).
- **Evolución Temporal de Gasto:** Gráficos financieros integrados con Apache ECharts con selector de horizonte temporal interactivo (3 meses, 6 meses, 1 año y Registro Histórico completo).
- **Edición Inline en Tiempo Real:** Componentes reactivos (`EditableField`) para la modificación inmediata de datos filiales, teléfonos y direcciones directamente desde la cabecera del perfil, sin recarga de página.
- **Subida & Recorte de Avatares:** Integración de `vue-advanced-cropper` con compresión asistida y generación de imágenes optimizadas.
- **Buscador de Alto Rendimiento:** Desacoplamiento del campo de entrada de búsqueda respecto a la llamada API debounced (~500ms), incorporando botón de limpieza instantánea (`X`) y paginación acotada en servidor para evitar consumo excesivo de memoria.

### Módulo 3: Tratamientos Estéticos, Fichas Técnicas & Consentimientos Digitales
- **Cuestionario Clínico de Anamnesis:** 20 preguntas ponderadas sobre salud, contraindicaciones, alergias y medicación, evaluadas con semáforo de idoneidad clínica (*Apto / Precaución / No Apto*).
- **Parámetros Físicos de Láser Diodo SHR:** Registro metrológico por sesión de fluencia ($J/cm^2$), frecuencia de disparo ($Hz$), contador total de disparos y clasificación de fototipo de piel según la escala Fitzpatrick (I a VI).
- **Parámetros Técnicos de Indiba Deep Beauty / Deep Care:** Control del modo de emisión (Capacitivo CAP / Resistivo RES), frecuencia fija de 448 kHz, potencia porcentual y cronometraje de tratamiento.
- **Consentimientos Informados Digitales (LGPD):** Formularios oficiales específicos para RGPD general, Láser SHR e Indiba Deep Beauty.
- **Firma Manuscrita Biométrica en Canvas:** Captura de trazo vectorial sobre elemento HTML5 Canvas con conversión y validación de formato Base64.
- **Autorización de Menores de Edad:** Flujo legal obligatorio para pacientes menores de 18 años, requiriendo datos identificativos y archivo adjunto del documento de identidad del progenitor o tutor legal (validador de hasta 5 MB y extensiones seguras).
- **Inmutabilidad Documental:** Bloqueo contra alteración de consentimientos ya rubricados (código HTTP 409); el sistema exige la emisión de una revocación formal documentada.
- **Exportación Vectorial a PDF:** Motor integrado con `jsPDF` para la impresión inmediata y descarga de consentimientos firmados para el paciente o archivo clínico.

### Módulo 4: Agenda Inteligente Multicabina & Motor de Citas
- **Múltiples Perspectivas de Calendario:**
  - **Vista Diaria (`AgendaDayView`):** Cronograma horario de alta precisión con cálculo milimétrico de posición visual según hora de inicio y duración de la cita.
  - **Vista Cuadrícula (`AgendaGridView`):** Matriz simultánea que distribuye citas en columnas por cabina de trabajo y profesional asignado.
  - **Vista Mensual (`AgendaMonthView`) & Anual:** Planificadores de alta densidad para seguimiento de ocupación y previsión de demanda.
- **Validación Atómica contra Solapamientos:** Función centralizada `validateBookingOverlap` en el backend que verifica la disponibilidad de cabinas y profesionales antes de persistir cualquier cita.
- **Cajón Lateral Interactivo (`BookingDrawer`):** Componente unificado para alta y edición de citas con selector polimórfico de servicios y detección reactiva de bonos disponibles del cliente.
- **Precarga de Cliente Contextual:** Al pulsar "Agendar Nueva Cita" desde el perfil de una clienta, el formulario carga automáticamente su expediente evitando errores manuales de asignación.
- **Conciliación de Citas Huérfanas:** Herramienta `sync-bookings-sales.ts` para correlacionar citas finalizadas con tickets emitidos en TPV, marcándolas de forma segura como COMPLETADAS.

### Módulo 5: TPV Omnicanal, Carrito & Facturación Veri*Factu
- **Punto de Venta Rápido:** Terminal táctil con filtrado por categorías, búsqueda de servicios y cosméticos, e inserción instantánea al carrito de compras.
- **Canales de Cobro Diversificados:** Soporte simultáneo para Efectivo, Tarjeta Bancaria, Bizum, Canje de Bonos y Pasarela de Pagos Fraccionados de Stripe.
- **Fijación de Precios en el Servidor (Anti-Tampering):** El servidor calcula los precios unitarios, subtotales, tipos impositivos y descuentos consultando directamente el catálogo en MariaDB; se descartan valores arbitrarios enviados por el cliente web.
- **Gestión de Cuentas por Cobrar (Deudas):** Módulo para ventas a crédito con registro de abonos parciales, actualización transaccional condicionada (prevención de *lost updates*) y emisión automática de ticket fiscal una vez saldada la totalidad.
- **Cumplimiento Veri*Factu (RD 1007/2023):**
  - Numeración correlativa anual (`BBH-YYYY-XXXX`) controlada mediante la tabla `sequences`.
  - Encadenamiento criptográfico con algoritmo SHA-256 entre huellas de tickets consecutivos.
  - Generación de código QR fiscal normalizado con metadatos tributarios.
  - Cliente de comunicación telemática vía protocolo SOAP para suministro de registros de facturación ante la AEAT.

### Módulo 6: Bonos, Paquetes de Sesiones & Sistema de Compartición
- **Modelo de Entidades Relacionales:** Modelos declarativos en Prisma (`Package`, `PackageItem`, `ClientPackage`, `ClientPackageItem`).
- **Separación Contractual de Operaciones:**
  - Operación `package_sale`: Facturación del bono en TPV al precio estipulado en catálogo, aprovisionando una entidad `ClientPackage` con 6 meses de caducidad.
  - Operación `package`: Canje de sesiones adquiridas a 0,00 € en ticket fiscal, con deducción inmediata del contador de sesiones pendientes.
- **Consumo Atómico Concurrente:** Descuento condicionado a saldo positivo ejecutado mediante `updateMany`; si dos operaciones concurrentes intentan consumir la última sesión, una de ellas se cancela con código HTTP 409 y la transacción se revierte íntegramente.
- **Sistema de Bonos Compartidos (`client_package_shares`):**
  - Posibilidad de que el titular autorice a beneficiarios registrados en el CRM para hacer uso de sus sesiones.
  - Reglas de negocio: el bono pertenece jurídicamente al comprador original; las deducciones automáticas en TPV usan bonos propios; los bonos compartidos requieren autorización explícita en cabina.

### Módulo 7: Catálogo de Servicios, Cosméticos & Gestión de Marcas
- **Gestión Integral de Productos:** Control de stock físico, precios de venta, SKU único, tipo impositivo aplicable y asociación con marcas comerciales, categorías y subcategorías.
- **Gestión de Servicios & Tratamientos:** Definición de tiempos de ejecución de cabina, precio base, IVA asociado y generación automática de códigos internos de servicio.
- **Paquetes Mixtos & Individuales:** Creación de bonos multisesión y paquetes combinados (servicios estéticos + cosméticos de apoyo domiciliario) con cálculo automático de sesiones bonificadas.

### Módulo 8: Business Intelligence, Analítica Financiera & Exportación Fiscal
- **Panel de Informes Analíticos:** Cuadro de mando con KPIs en tiempo real: volumen total facturado, ticket medio, distribución porcentual por método de pago y volumen de citas atendidas.
- **Motor de Exportación Fiscal Flexible:**
  - Selector de periodos: Día específico, Semana, Mes natural, Trimestres fiscales (Q1, Q2, Q3, Q4), Año en curso y Rango histórico global.
  - Desglose contable de bases imponibles y cuotas repercutidas por tipo de IVA (21%, 10%, 4% y operaciones exentas).
  - Exportación con subtotales mensuales tabulados en formato CSV (compatible con software contable) y documentos PDF formales maquetados con jsPDF.

### Módulo 9: Arquitectura de Datos MariaDB, Conexión Plesk & DevOps
- **Adaptador de Base de Datos Optimizado:** Configuración de Prisma 7 con `@prisma/adapter-mariadb` y pool de conexiones ajustado con `allowPublicKeyRetrieval` y resolución directa IPv4 para mitigar latencias en entornos VPS Plesk / AlmaLinux.
- **Almacenamiento Privado de Archivos:** Reubicación de ficheros de `public/uploads` a `./.data/uploads` inaccesible directamente por HTTP, servidos exclusivamente tras validación de sesión en `/api/files/*`.
- **Sanitización de Archivos con Sharp:** Detección de tipos por cabeceras binarias (*magic bytes*), recodificación forzosa a WebP y eliminación completa de metadatos sensibles (EXIF / GPS).
- **Scripts de Mantenimiento & Sincronización:** Herramientas CLI idempotentes para comprobación de base de datos (`check-db.ts`), parcheo de esquemas (`fix-db-tables.ts`), migración de tickets (`migrate-ticket-numbers.ts`) y migración privada de uploads (`migrate-uploads-private.ts`).

---

## 📅 Cronología Detallada por Hitos y Versiones

A continuación se detalla la evolución técnica y funcional de la plataforma organizada por entregas sucesivas desde el inicio del proyecto:


### Sin publicar — Cupones, Pagos de Deuda, Email de Citas & Guía de Despliegue (Octubre 2026)
**Rango de Commits:** `c574ce5` a `36cfccd` · **Requiere:** `pnpm db:fix` antes de desplegar

- **Cupones y descuentos:** cupones con código, validez y usos máximos, aplicables en TPV, en ventas a deber y con descuentos manuales en € o %. Ticket y factura muestran cada descuento; la factura reparte el descuento por tipo de IVA.
- **Deudas:** las ventas a deber se facturan al crearlas, en una sola operación atómica. Cada cobro genera su recibo ("Pago X de N") y la factura reimpresa muestra el historial de cobros.
- **/ventas:** cada venta aparece una vez con su estado de pago, más una fila "Cobro de deuda" por cada cobro. Los totales se separan en Facturado y Cobrado. Las consultas aceptan rango de fechas y tienen tope de 1000 filas.
- **Pago mixto:** guarda el desglose por método y lo valida contra el total del servidor.
- **Ticket y factura:** datos reales del salón (NIF, nombre, dirección, teléfono) desde configuración, etiquetas de todos los métodos de pago y número de factura real.
- **Citas:** checkbox de confirmación por email al crear la cita, con Nodemailer y SMTP por variables de entorno. La cita se guarda aunque el envío falle.
- **Seguridad:** script `pnpm admin:reset-password` para rotar la contraseña de un admin y cerrar sus sesiones.
- **Documentación:** nuevo [tutorial de despliegue en Plesk](docs/tutorial-despliegue-plesk.md).


### v2.0.0 — Gran Hardening de Seguridad, Bonos Compartidos & RGPD (Octubre 2026)
**Rango de Commits:** `a2128e0` (#253) a `14629a0` (#302) · **Total:** 50 commits

Este hito representa la maduración definitiva de la plataforma en términos de seguridad perimetral, integridad de datos, cumplimiento riguroso del RGPD y de la normativa tributaria Veri*Factu:

#### 1. Endurecimiento de Seguridad (Fase 1 — Fallos Críticos)
- **Cierre de Brecha en Carritos Públicos:** Eliminación de `/api/sales/carts` de la lista blanca de rutas públicas (`auth.ts`).
- **Secreto JWT & Algoritmo (`3b21335` - J1/J5):** Supresión del valor por defecto en código fuente; la aplicación se rehúsa a iniciar en producción si `JWT_SECRET` no cuenta con al menos 32 caracteres. Firma fijada irrevocablemente en `HS256`.
- **Gestión Segura de Usuarios (`3a04561` - C1/C2):** Protección de todas las mutaciones en `/api/users` mediante `requireAdmin` y esquemas Zod con `.strict()`. Eliminación de contraseñas por defecto; coste bcrypt elevado a 12. Blindaje que impide eliminar al último administrador del sistema.
- **Prohibición de Acceso a Clientes (`3ea301f` - C3):** Las cuentas de clientas no pueden iniciar sesión administrativa; asignación de hash aleatorio e inoperable en el alta de clientes.
- **Protección Perimetral RBAC (`9442e4e` - A5/A7):** Restricción de acceso en toda la API exclusivamente a roles `STAFF` y `ADMIN`. Las rutas públicas se comparan mediante coincidencia exacta de ruta.
- **Inmutabilidad de Consentimientos Médicos (`7a172cd` - C4):** Los datos clínicos y de salud quedan restringidos a administradores. Los consentimientos firmados son inmutables (HTTP 409).
- **Eliminación de Contraseñas en Navegador (`d9f9dbb` - J4):** Supresión total de contraseñas guardadas en `localStorage` en el formulario de login.

#### 2. Endurecimiento de Seguridad (Fase 2 — Defensa en Profundidad)
- **Subida Segura de Archivos (`c494d69` - U1):** Lista blanca estricta de carpetas de destino; validación de tipo mediante *magic bytes* descartando vectores maliciosos (SVG, HTML). Conversión forzosa de imágenes a WebP mediante Sharp con eliminación de metadatos EXIF y coordenadas GPS.
- **Bloqueo por Intentos Fallidos (`17d3366` - L1):** Implementación de bloqueo temporal tras 3 fallos consecutivos en login (15 minutos con duplicación progresiva hasta 24 horas); respuesta HTTP 423 con contador atómico en base de datos.
- **Limitador de Tasa tras Proxy Inverso (`6f7fb24`):** Detección fidedigna de la IP del cliente según saltos de proxy confiables (`TRUSTED_PROXY_HOPS`). Límite estricto de 5 intentos/minuto en login y 300 peticiones/minuto en la API.
- **Validación contra Mass Assignment (`95a1dda` - V1/V3):** Validación Zod de todos los payloads entrantes en catálogos, servicios y cuentas por cobrar.
- **Fijación de Precios en el Servidor (`4612fd8` - V2):** Los precios, subtotales, impuestos y descuentos máximos se calculan y validan exclusivamente en el servidor consultando la base de datos MariaDB.
- **Cabeceras HTTP de Endurecimiento (`eb0de02` - H1):** Configuración de directivas HSTS, nosniff, X-Frame-Options, Permissions-Policy y CSP en Nitro.
- **Actualización de Dependencias a Node 26 (`3d7e420`):** Actualización a Nuxt 4.6.2, Prisma 7.10.1, Vue 3.5.44 y resolución de vulnerabilidades de dependencias transitivas mediante directivas `pnpm.overrides`.

#### 3. Bloque A de Seguridad & Privacidad RGPD
- **Protección de Datos Personales en Logs (`e0d222c` - D2):** Supresión de volcados de depuración de cuerpos de petición (PII) en rutas de almacenamiento local.
- **Sanitización de Errores de API (`6729428` - D1):** Plugin centralizado de Nitro para capturar excepciones 5xx y devolver mensajes genéricos a los clientes web, preservando el detalle técnico en los logs internos del servidor.
- **Aislamiento de Ítems de Bonos (`f64ee89` - A6/V3):** Las modificaciones de ítems de bonos se encuentran estrictamente acotadas al ID del bono titular.
- **Validación Estricta de Agenda (`11e3053`):** Validación completa con Zod de modificaciones de citas.
- **Prevención de Carreras en Pagos de Deudas (`98c0c86` - F5):** Actualización condicional atómica en base de datos; respuesta 409 si el saldo pendiente fue modificado concurrentemente.
- **Estado de Envío Veri*Factu Fiel (`d93818c` - F2):** Las facturas solo se marcan como enviadas si existe un certificado digital válido configurado y la transmisión es exitosa; en caso contrario se registran como `not_configured`.
- **Almacenamiento Privado & Servido Autenticado (`8306c88` - U2):** Retirada de archivos de `public/uploads/` hacia un directorio privado persistente, servidos únicamente a través de `/api/files/*` con autenticación de personal.
- **Cookies HttpOnly & Revocación de Sesión (`9c4cf47` - J2/J3):** Emisión de cookies `httpOnly; SameSite=Strict` y mecanismo de invalidación instantánea mediante `token_version`.
- **Anonimización de Respuestas de Usuario (`27249da`, `bc42bdd`):** Función `toPublicUser` que elimina `password`, `refresh_token`, `token_version`, `failed_login_count` y `locked_until` de todas las salidas de la API.
- **Privacidad en Tipografías Web (`eb85240`, `14629a0`):** Definición de la tipografía **Roboto** como fuente principal del dashboard (con *Mulish* como respaldo), servidas mediante `@nuxt/fonts` bajo `/_fonts` con descarga local en compilación y sin conexiones externas a Google, cumpliendo el RGPD y la Content Security Policy.

#### 4. Nuevas Funcionalidades de Negocio
- **Módulo de Ficha Clínica & Parámetros Técnicos (`a4b2777`):** Registro técnico de sesiones de Láser SHR (fototipo, fluencia, frecuencia, disparos) e Indiba Deep Beauty (modo capacitivo/resistivo, 448 kHz, potencia, tiempo).
- **Sistema de Bonos Compartidos (`e6d1fe8`):** Modelo de base de datos y endpoints para asignación de beneficiarios y consumo atómico concurrente de sesiones.


### v1.5.0 — Correlatividad Anual de Tickets, Conciliación de Citas & Migración DDL (Octubre 2026)
**Rango de Commits:** `dbc4f49` (#265) a `121eb4d` (#269) · **Total:** 5 commits

- **Numeración Anual Correlativa:** Unificación de la secuencia de facturación fiscal en formato `BBH-YYYY-XXXX` (`0001` a `0390`+) garantizando la continuidad anual exigida por la normativa tributaria y resolviendo reseteos mensuales indeseados.
- **Auditoría & Verificación de Secuencias:** Creación del script `verify-ticket-numbers.ts` (`pnpm tickets:verify`) para comprobar la correlatividad de secuencias y su concordancia temporal con las citas de la agenda.
- **Migración Asistida de Tickets:** Script `migrate-ticket-numbers.ts` con modo de simulación segura (dry-run) y aplicación en vivo (`--apply`) para re-secuenciar tickets preexistentes.
- **Conciliación de Citas con Ventas:** Script `sync-bookings-sales.ts` para asociar citas huérfanas de agenda con comprobantes de cobro emitidos en TPV y actualizarlas a estado COMPLETADA.
- **Remediación DDL en Caliente:** Script `fix-db-tables.ts` (`pnpm db:fix`) para crear de forma idempotente tablas relacionales y columnas requeridas en MariaDB sin riesgo de pérdida de datos.
- **Componente SalesMetrics:** Indicadores clave de rendimiento comercial con gráficos de chispa (*sparklines*) para el seguimiento diario y mensual de ventas.


### v1.4.0 — Agentes de Desarrollo, Consentimientos Avanzados & BI Fiscal (Septiembre 2026)
**Rango de Commits:** `152e694` (#244) a `9f46148` (#252) · **Total:** 9 commits

- **Marco de Agentes de Desarrollo:** Inicialización del ecosistema de desarrollo guiado por agentes en `.agents/skills/` (habilidades de arquitectura, calidad, bucles iterativos y memoria técnica).
- **Módulo Integral de Consentimientos Informados (`d6eb37f`):**
  - Textos normativos oficiales adaptados al RGPD y a las especificidades de tratamientos con Indiba Deep Beauty y Láser Diodo SHR.
  - Firma manuscrita digitalizada sobre elemento Canvas.
  - Subida de autorizaciones de menores de edad con comprobación de identidad de tutores legales.
  - Generación de resguardos oficiales en PDF mediante jsPDF.
- **Cuadro de Mandos de Business Intelligence (`fba32e6`):** Visualización analítica de métricas de facturación, servicios más demandados y rendimiento por profesional.
- **Motor de Exportación Fiscal (`948f02f`, `9f46148`):** Interfaz modal con cálculo de bases imponibles desglosadas por tipos de IVA y generación de reportes tabulados en CSV y PDF estructurados por trimestres tributarios (Q1-Q4).


### v1.3.0 — Sistema de Bonos/Paquetes, Diseño Gogo Admin & Tipado TypeScript Estricto (Agosto 2026)
**Rango de Commits:** `56342b6` (#187) a `4b6f00e` (#243) · **Total:** 57 commits

- **Reingeniería del Sistema de Bonos (`3b3ad3b`, `f7c10d1`):**
  - Creación de modelos relacionales: `Package`, `PackageItem`, `ClientPackage`, `ClientPackageItem`.
  - Definición del contrato dual: `package_sale` (venta en TPV con precio de catálogo) vs `package` (canje a 0 € con deducción de saldo).
  - Venta de bonos tanto desde mostrador TPV como desde el cajón de citas de la agenda.
  - Inclusión de bonos en la edición de compras existentes con aprovisionamiento automático de paquetes para la clienta.
- **Rediseño del Perfil de Cliente Bento Grid 2027 (`2238249`):**
  - Clasificación de fidelización: Bronce, Plata y Oro VIP.
  - Gráficos interactivos de evolución de gasto y desglose de formas de pago con Apache ECharts.
  - Componentes especializados `ProfileHealthSection` y `ProfilePackagesSection`.
- **Sistema de Diseño Gogo Admin & Tokens Globales (`47b1b7c`, `22f57ef`, `8418404`):**
  - Implementación de tokens de diseño semánticos sobre Tailwind CSS y DaisyUI.
  - Componente accesible `AppSelect` reemplazando selects nativos en toda la interfaz.
  - Selector de tema visual con pastilla animada sol/luna (`ThemeToggle.vue`).
- **Refactorización Masiva TypeScript & Limpieza de Lint (`0cd73c2` a `4b6f00e`):**
  - Erradicación de todos los tipos `any` en la capa de datos del servidor (82 errores corregidos).
  - Creación de DTOs formales de dominio: `ClientDTO`, `Debt`, `Questionnaire`, `Consent`, `Revoke`, `ClientProfile`.
  - Tipado riguroso de componentes de agenda (vistas Day/Grid/List/Month/Year con guardas de layout).
  - Eliminación sistemática de importaciones, parámetros y variables en desuso en más de 30 componentes y páginas.


### v1.2.0 — BookingDrawer, Servidor MCP Excalidraw, Conexión Plesk & Rendimiento (Julio 2026)
**Rango de Commits:** `1f1acbb` (#135) a `67be1df` (#186) · **Total:** 52 commits

- **Componente BookingDrawer (`693e139`, `4cb4584`):** Cajón deslizante reactivo para agendar citas con gestión fluida de servicios y conexión directa con el carrito de cobro de TPV.
- **Servidor MCP Excalidraw (`f9b4d1c` a `88dcac9`):** Integración de herramientas MCP para diagramación técnica y visualización de planos de cabinas.
- **Optimización de Base de Datos Remota en Plesk (`c7357dc`):** Configuración del adaptador MariaDB con `allowPublicKeyRetrieval` y mapeo estricto a IPv4 para erradicar tiempos muertos de conexión.
- **Auditoría de Rendimiento & Corrección de Fugas de Memoria (`8634128`, `67be1df`):**
  - Eliminación del intervalo de sondeo (*polling*) innecesario de 3 segundos en la ficha del cliente.
  - Conversión del gestor `useSync` basado en `BroadcastChannel` a un patrón Singleton para evitar la proliferación de escuchadores de eventos.
  - Paralelización de consultas Prisma complejas mediante `Promise.all` en los endpoints analíticos y de perfil de clienta.
  - Sanitización de fechas en `EditableField` al formato ISO estándar `yyyy-MM-dd`.


### v1.1.0 — Consolidación de Agenda, Patrones GoF & Animaciones GSAP (Abril – Junio 2026)
**Rango de Commits:** `0527b4b` (#110) a `8e5a4a3` (#134) · **Total:** 25 commits

- **Evolución de Agenda & Vistas de Cabina (`b4cc768` a `4cedfd4`):** Implementación de `AgendaDayView` con cuadrícula de línea de tiempo precisa y cálculo dinámico de alturas según duración del tratamiento.
- **Validación contra Solapamientos (`1562d84`):** Algoritmo de comprobación en backend para evitar la superposición de horarios entre citas en una misma cabina.
- **Pantalla de Autenticación Animada (`975a0f4`):** Formulario de inicio de sesión con validación de campos, transiciones fluidas de GSAP y estados de carga.
- **Patrones de Arquitectura Software (`1f1acbb`):** Incorporación de patrones estructurales Adapter y Observer para la sincronización desacoplada entre los módulos de Agenda y TPV.
- **Gestión Automática de Códigos Internos (`b8a96ad`):** Asignación autónoma de identificadores correlativos para tratamientos y servicios de estética.
- **Configuración de Entorno de Ejecución (`96483dd`):** Fijación del estándar de Node.js v24 en el archivo `.node-version`.


### v1.0.0 — Fundación de la Plataforma, Catálogo, TPV Inicial & Veri*Factu Base (Febrero – Marzo 2026)
**Rango de Commits:** `f879b32` (#1) a `9c7252e` (#109) · **Total:** 109 commits

- **Commit Inicial (`f879b32`, 28/02/2026):** Estructura base del proyecto con Nuxt, Vue 3, Nitro y Tailwind CSS.
- **Gestión de Usuarios y Seguridad Inicial (`493915e`, `38b2641`):** Operaciones CRUD de usuarios, encriptación bcrypt, emisión inicial de tokens JWT y soporte i18n para Español, Inglés y Polaco.
- **Catálogo Base de Artículos (`97fb699`, `fdbc760`, `5f125e8`):** Creación de esquemas relacionales para Marcas, Categorías, Subcategorías, Etiquetas, Productos y Servicios de estética.
- **Primer Terminal de Punto de Venta (TPV) (`099b3d4`, `b405740`, `ac3f776`):** Navegación táctil de catálogo, carrito reactivo de compra, asignación de clientes y pasarela de cobro.
- **Cuentas por Cobrar & Deudas (`d9e12fa`, `edf1718`, `dcffced`):** Control de cobros pendientes con filtros, búsqueda y pagos parciales.
- **Integración Inicial Veri*Factu (`f79e1bc`, `31861bc`, `f006383`):** Primeras utilidades de encadenamiento criptográfico con SHA-256 y cliente SOAP para comunicación con la Agencia Tributaria (AEAT).
- **Animaciones GSAP para Diálogos (`99938e6`):** Composable `useModalAnimation` para aperturas y cierres cinematográficos de ventanas modales nativas.
- **Módulo de Consentimientos Inicial (`3b6d297`, `edd1fc5`):** Cuestionarios médicos y autorizaciones de tratamiento con captura de firma.
- **Pagos Aplazados con Stripe (`838560d`, `4b66614`):** Soporte para cobro fraccionado con tarjeta bancaria.
- **Entrada de Servidor para Despliegues (`691f4c0`):** Creación de `server.cjs` como lanzador compatible con servidores gestionados (Plesk / Phusion Passenger).


---

## 📋 Registro Exhaustivo de Todos los Commits

A continuación se indexan individualmente la totalidad de los **302 commits** que conforman la historia del repositorio, desde el commit fundacional hasta el más reciente:

| # | Hash | Fecha | Autor | Mensaje de Commit |
|---|---|---|---|---|

| 1 | [`f879b32`](file:///git-commit/f879b32) | 2026-02-28 | Robert Hernandez Arenas | Initial commit |
| 2 | [`493915e`](file:///git-commit/493915e) | 2026-02-28 | Robert Hernandez Arenas | :tada: Implement initial user management with CRUD operations, authentication, filtering, pagination, and i18n. |
| 3 | [`38b2641`](file:///git-commit/38b2641) | 2026-03-02 | Robert Hernandez Arenas | :wrench:D implement initial dashboard structure with authentication, user management, and core UI components. |
| 4 | [`ccdc18e`](file:///git-commit/ccdc18e) | 2026-03-02 | Robert Hernandez Arenas | :wrench: Implement core user management UI components and establish the default application layout. |
| 5 | [`97fb699`](file:///git-commit/97fb699) | 2026-03-02 | Robert Hernandez Arenas | :wrench: Add product management functionality including API endpoints and UI for listing, creating, and editing products. |
| 6 | [`fdbc760`](file:///git-commit/fdbc760) | 2026-03-02 | Robert Hernandez Arenas | :wrench: Implement core database schema for users, catalog, services, and packs, alongside user seeding and initial CRUD for services and packs. |
| 7 | [`77085e9`](file:///git-commit/77085e9) | 2026-03-03 | Robert Hernandez Arenas | :wrench: Implement initial API endpoints, dashboard pages, and components for agenda, services, marketing, catalog, and sales management. |
| 8 | [`5f125e8`](file:///git-commit/5f125e8) | 2026-03-03 | Robert Hernandez Arenas | :wrench: Implement client and catalog management, including brands, categories, and tags, with new authentication endpoints, localization, and database schema. |
| 9 | [`fc11b32`](file:///git-commit/fc11b32) | 2026-03-03 | Robert Hernandez Arenas | 🔧 Implement client and catalog management, including brands, categories, and tags, with new authentication endpoints, localization, and database schema. |
| 10 | [`0d52f78`](file:///git-commit/0d52f78) | 2026-03-03 | Robert Hernandez Arenas | :wrench: Implement agenda and booking management page and add database seed script. |
| 11 | [`28fad4c`](file:///git-commit/28fad4c) | 2026-03-03 | Robert Hernandez Arenas | :wrench: Introduce new dashboard sections for sales, catalog (categories, tags), configuration, and reports, alongside an engineering manual. |
| 12 | [`ba36e1a`](file:///git-commit/ba36e1a) | 2026-03-04 | Robert Hernandez Arenas | :wrench: Implement core dashboard layout with internationalization and initial catalog management for categories and subcategories, including API endpoints and UI components. |
| 13 | [`e41bff3`](file:///git-commit/e41bff3) | 2026-03-04 | Robert Hernandez Arenas | :wrench: Add catalog brand and tag management pages with full CRUD operations. |
| 14 | [`2a4940b`](file:///git-commit/2a4940b) | 2026-03-04 | Robert Hernandez Arenas | :wrench: Implement full CRUD for product categories, including subcategory management, with dedicated API endpoints and a new UI component. |
| 15 | [`099b3d4`](file:///git-commit/099b3d4) | 2026-03-04 | Robert Hernandez Arenas | :wrench: add TPV (Point of Sale) page with catalog browsing, cart management, client selection, and checkout functionality. |
| 16 | [`b405740`](file:///git-commit/b405740) | 2026-03-04 | Robert Hernandez Arenas | :wrench: Introduce Point of Sale (TPV) page with internationalization support for English, Spanish, and Polish, and disable devtools. |
| 17 | [`357d0cf`](file:///git-commit/357d0cf) | 2026-03-05 | Robert Hernandez Arenas | :WRENCH: add new Point of Sale (TPV) page with catalog, cart, client management, and checkout functionality. |
| 18 | [`7feb40a`](file:///git-commit/7feb40a) | 2026-03-05 | Robert Hernandez Arenas | :wrench: Implement brand catalog management page, comprehensive database seeding, and a default layout. |
| 19 | [`d9e12fa`](file:///git-commit/d9e12fa) | 2026-03-05 | Robert Hernandez Arenas | :wrench: implement debt management page for accounts receivable with filtering, search, and payment processing functionality. |
| 20 | [`edf1718`](file:///git-commit/edf1718) | 2026-03-05 | Robert Hernandez Arenas | :wrench: add debts management page, API, and Spanish, Polish, and English localization. |
| 21 | [`26fde72`](file:///git-commit/26fde72) | 2026-03-05 | Robert Hernandez Arenas | :wrench: implement core application layout and dedicated pages for user and sales management |
| 22 | [`028111b`](file:///git-commit/028111b) | 2026-03-05 | Robert Hernandez Arenas | :wrench: implement sales history page with search, filter, and detail view for completed sales. |
| 23 | [`7fda053`](file:///git-commit/7fda053) | 2026-03-05 | Robert Hernandez Arenas | feat: Add initial dashboard structure including overview, sales, and reports pages with i18n. |
| 24 | [`f79e1bc`](file:///git-commit/f79e1bc) | 2026-03-05 | Robert Hernandez Arenas | :wrench: Implement TPV system with Veri*Factu compliance for sales, invoicing, and cart management. |
| 25 | [`9529a16`](file:///git-commit/9529a16) | 2026-03-06 | Robert Hernandez Arenas | :wrench: pages and components for sales, marketing, catalog, clients, and more. |
| 26 | [`caf70c2`](file:///git-commit/caf70c2) | 2026-03-06 | Robert Hernandez Arenas | docs: Add GEMINI.md to provide project context and development guidelines for AI assistance. |
| 27 | [`aec59c5`](file:///git-commit/aec59c5) | 2026-03-06 | Robert Hernandez Arenas | 📝 Add comprehensive project documentation covering features, architecture, and development, and remove temporary log files. |
| 28 | [`6409b57`](file:///git-commit/6409b57) | 2026-03-07 | Robert Hernandez Arenas | :wrench: Implement initial dashboard pages and components for marketing, sales, reports, services, catalog, packs, TPV, overview, and finances, along with related modals and utility functions. |
| 29 | [`532ef82`](file:///git-commit/532ef82) | 2026-03-08 | Robert Hernandez Arenas | :wrench: Introduce dashboard with TPV, catalog, marketing, client, user, and service management modules, along with foundational UI components and documentation. |
| 30 | [`dfaf2d6`](file:///git-commit/dfaf2d6) | 2026-03-09 | Robert Hernandez Arenas | :wrench:  Add product catalog management and agenda pages. |
| 31 | [`3b6d297`](file:///git-commit/3b6d297) | 2026-03-10 | Robert Hernandez Arenas | :wrench: Implement client questionnaire, consent, and revocation management with dedicated UI and API endpoints. |
| 32 | [`edd1fc5`](file:///git-commit/edd1fc5) | 2026-03-10 | Robert Hernandez Arenas | :wrench: Add client consent management, TPV and sales pages, and Stripe payment integration. |
| 33 | [`37fba05`](file:///git-commit/37fba05) | 2026-03-10 | Robert Hernandez Arenas | :wrench: Initialize dashboard UI with core components, various modals for data management, and a dedicated client management page. |
| 34 | [`67e686a`](file:///git-commit/67e686a) | 2026-03-10 | Robert Hernandez Arenas | :wrench: Implement default application layout including a responsive sidebar, navbar, and dynamic active navigation. |
| 35 | [`99e2aa4`](file:///git-commit/99e2aa4) | 2026-03-10 | Robert Hernandez Arenas | :wrench: Introduce user management page with user deletion functionality and animated modals. |
| 36 | [`99938e6`](file:///git-commit/99938e6) | 2026-03-11 | Robert Hernandez Arenas | :wrench: Add `useModalAnimation` composable for GSAP-powered cinematic opening and closing animations of native dialogs. |
| 37 | [`a068190`](file:///git-commit/a068190) | 2026-03-11 | Robert Hernandez Arenas | :wrench: Add initial dashboard pages for client, catalog, marketing, and other core modules. |
| 38 | [`b0e6a0b`](file:///git-commit/b0e6a0b) | 2026-03-11 | Robert Hernandez Arenas | :wrench: Introduce analytical reports page with charting capabilities and expanded localization. |
| 39 | [`bfb3710`](file:///git-commit/bfb3710) | 2026-03-12 | Robert Hernandez Arenas | :wrench: Implement initial dashboard structure with product and client management, API endpoints, database schema, and core documentation. |
| 40 | [`e4f7f89`](file:///git-commit/e4f7f89) | 2026-03-12 | Robert Hernandez Arenas | :wrench: Add client listing page with search, pagination, and a dedicated API endpoint for fetching clients. |
| 41 | [`caddb00`](file:///git-commit/caddb00) | 2026-03-12 | Robert Hernandez Arenas | :wrench: Introduce client form modal for creating and editing clients, with i18n support and Prisma schema integration. |
| 42 | [`bd676ba`](file:///git-commit/bd676ba) | 2026-03-13 | Robert Hernandez Arenas | :wrench: Add TPV (Point of Sale) page with catalog browsing, cart management, client selection, and payment processing. |
| 43 | [`ac3f776`](file:///git-commit/ac3f776) | 2026-03-13 | Robert Hernandez Arenas | :wrench: Implement a complete Point of Sale (TPV) page with catalog browsing, cart management, client selection, and various payment methods. |
| 44 | [`f268246`](file:///git-commit/f268246) | 2026-03-13 | Robert Hernandez Arenas | :wrench: add Prisma schema, core database models, and initial catalog management for products and tags. |
| 45 | [`fc4774b`](file:///git-commit/fc4774b) | 2026-03-13 | Robert Hernandez Arenas | :wrench: Implement client management with API endpoints and UI for listing, viewing, and data privacy for document numbers. |
| 46 | [`3e15648`](file:///git-commit/3e15648) | 2026-03-13 | Robert Hernandez Arenas | :wrench: Implement core dashboard pages and APIs for agenda, clients, products, services, and users, integrating Vue Query. |
| 47 | [`84afcd3`](file:///git-commit/84afcd3) | 2026-03-13 | Robert Hernandez Arenas | :wrench: Add initial localization files for English, Spanish, Galician, and Polish. |
| 48 | [`a91f7c1`](file:///git-commit/a91f7c1) | 2026-03-13 | Robert Hernandez Arenas | :wrench: Create a new default application layout with a responsive sidebar, top navigation bar, and global styling. |
| 49 | [`6591b20`](file:///git-commit/6591b20) | 2026-03-13 | Robert Hernandez Arenas | :wrench: Implement a new default application layout, a GSAP-powered modal animation composable, and the product catalog page. |
| 50 | [`4550dd1`](file:///git-commit/4550dd1) | 2026-03-13 | Robert Hernandez Arenas | :wrench: Implement product and client management features with a new global UI/UX styling and modal animation system. |
| 51 | [`b907f6f`](file:///git-commit/b907f6f) | 2026-03-13 | Robert Hernandez Arenas | :wrench: Implement core application structure, styling, Spanish localization, Prisma schema, and initial user, client, and agenda modules. |
| 52 | [`838560d`](file:///git-commit/838560d) | 2026-03-13 | Robert Hernandez Arenas | :wrench: Add Point of Sale (TPV) system with cart management, client selection, debt, and Stripe installment payments. |
| 53 | [`4b66614`](file:///git-commit/4b66614) | 2026-03-13 | Robert Hernandez Arenas | :wrench: Implement TPV page with Stripe installment payment functionality, including a modal and API endpoint. |
| 54 | [`fd4e0e7`](file:///git-commit/fd4e0e7) | 2026-03-14 | Robert Hernandez Arenas | :wrench: Implement agenda and booking management page with day, grid, list, month, and year views. |
| 55 | [`3d276a9`](file:///git-commit/3d276a9) | 2026-03-14 | Robert Hernandez Arenas | :wrench: implement agenda page with multiple view types including Day, Grid, List, Month, and Year views. |
| 56 | [`31861bc`](file:///git-commit/31861bc) | 2026-03-14 | Robert Hernandez Arenas | :wrench: Implement Veri*Factu electronic invoicing and AEAT submission by adding new API endpoints, utility functions for invoice generation and hashing, and integrating with the AEAT SOAP client. |
| 57 | [`f006383`](file:///git-commit/f006383) | 2026-03-14 | Robert Hernandez Arenas | :wrench: Integrate Veri*Factu for automatic invoice generation during payment confirmation and cart completion, and add new cart management endpoints. |
| 58 | [`9f9b841`](file:///git-commit/9f9b841) | 2026-03-14 | Robert Hernandez Arenas | Merge branch 'FEAT-StripeCheckoutSessions' |
| 59 | [`2025658`](file:///git-commit/2025658) | 2026-03-14 | Robert Hernandez Arenas | Merge branch 'FEAT-VerifactuV2' |
| 60 | [`da42660`](file:///git-commit/da42660) | 2026-03-14 | Robert Hernandez Arenas | :wrench: Implement new pages and modal forms for managing catalog, services, marketing, users, clients, bookings, and TPV. |
| 61 | [`532e69c`](file:///git-commit/532e69c) | 2026-03-14 | Robert Hernandez Arenas | :wrench: Implement a new agenda and booking management feature with multiple calendar views. |
| 62 | [`becf192`](file:///git-commit/becf192) | 2026-03-14 | Robert Hernandez Arenas | :wrench: Add `AgendaMonthView` component to display a monthly calendar with booking details and interactive date selection. |
| 63 | [`15ffa41`](file:///git-commit/15ffa41) | 2026-03-14 | Robert Hernandez Arenas | :wrench: implement a new default application layout with integrated breadcrumbs and sidebar navigation. |
| 64 | [`fb6d708`](file:///git-commit/fb6d708) | 2026-03-15 | Robert Hernandez Arenas | :wrench: Implement services management page with CRUD operations and add Apple Touch Icons. |
| 65 | [`4c92e32`](file:///git-commit/4c92e32) | 2026-03-15 | Robert Hernandez Arenas | :wrench: Implement comprehensive CRUD operations for clients, users, catalog, and consents, alongside authentication, multimedia management, offline sync, and PWA support. |
| 66 | [`081dcc9`](file:///git-commit/081dcc9) | 2026-03-16 | Robert Hernandez Arenas | :wrench: Implement consent API endpoint and establish comprehensive Prisma database schema. |
| 67 | [`475514f`](file:///git-commit/475514f) | 2026-03-16 | Robert Hernandez Arenas | :wrench: Implement client, catalog, and agenda features with new pages, components, and data privacy functionalities. |
| 68 | [`4a2968f`](file:///git-commit/4a2968f) | 2026-03-16 | Robert Hernandez Arenas | :wrench: Implement initial dashboard sections and components for marketing, catalog, users, sales, reports, finance, agenda, services, and TPV. |
| 69 | [`79cd8c7`](file:///git-commit/79cd8c7) | 2026-03-16 | Robert Hernandez Arenas | :wrench: implement a comprehensive database seeding script to populate users, consents, questionnaires, catalog, and bookings. |
| 70 | [`1931fe6`](file:///git-commit/1931fe6) | 2026-03-16 | Robert Hernandez Arenas | :wrench: Add database seeding script to populate initial data for users, catalog, and client records. |
| 71 | [`e9754c8`](file:///git-commit/e9754c8) | 2026-03-16 | Robert Hernandez Arenas | :wrench: Introduce client management with API for CRUD operations, UI components, multimedia upload, and database seeding. |
| 72 | [`e973444`](file:///git-commit/e973444) | 2026-03-17 | Robert Hernandez Arenas | Merge branch 'FEAT-PWADataPersistence' |
| 73 | [`994b440`](file:///git-commit/994b440) | 2026-03-17 | Robert Hernandez Arenas | :wrench: Implement TPV (Point of Sale) system, client management, sales API, and global authentication. |
| 74 | [`a9c2993`](file:///git-commit/a9c2993) | 2026-03-17 | Robert Hernandez Arenas | :wrench: Add client form modal for creating and editing clients with avatar upload capability. |
| 75 | [`ef35515`](file:///git-commit/ef35515) | 2026-03-19 | Robert Hernandez Arenas | :wrench: Implement client management page with full CRUD operations, search, and pagination. |
| 76 | [`8607c4c`](file:///git-commit/8607c4c) | 2026-03-19 | Robert Hernandez Arenas | :wrench: Add client list page with search, CRUD operations, and data privacy, and create Gemini documentation file. |
| 77 | [`51b5a7d`](file:///git-commit/51b5a7d) | 2026-03-19 | Robert Hernandez Arenas | :wrench: Add base application layout with responsive sidebar and new logo assets. |
| 78 | [`c620f11`](file:///git-commit/c620f11) | 2026-03-20 | Robert Hernandez Arenas | :wrench: Implement client profile page with editable fields, booking modal, and detailed sections, alongside a database seeding script. |
| 79 | [`6320003`](file:///git-commit/6320003) | 2026-03-20 | Robert Hernandez Arenas | :wrench: introduce engineering manual and a new `EditableField` shared component. |
| 80 | [`f252435`](file:///git-commit/f252435) | 2026-03-20 | Robert Hernandez Arenas | :wrench: Implement image cropping for client avatar uploads and create a new client profile header component. |
| 81 | [`15fadd6`](file:///git-commit/15fadd6) | 2026-03-20 | Robert Hernandez Arenas | :wrench: Add default dashboard layout with responsive sidebar, navbar, and dynamic navigation. |
| 82 | [`40adaac`](file:///git-commit/40adaac) | 2026-03-20 | Robert Hernandez Arenas | :wrench: add client profile header component and initial client avatar images. |
| 83 | [`62e0f2a`](file:///git-commit/62e0f2a) | 2026-03-20 | Robert Hernandez Arenas | :wrench: introduce client profile page with detailed information, booking history, and document management. |
| 84 | [`99fc6f9`](file:///git-commit/99fc6f9) | 2026-03-21 | Robert Hernandez Arenas | :wrench: introduce generic EditableField component and client ProfileHeader with avatar upload functionality. |
| 85 | [`d11afff`](file:///git-commit/d11afff) | 2026-03-21 | Robert Hernandez Arenas | :wrench: implement comprehensive Prisma schema and foundational client management features with associated API endpoints and UI components. |
| 86 | [`18b9b1c`](file:///git-commit/18b9b1c) | 2026-03-21 | Robert Hernandez Arenas | :wrench: add client detail view, API, and purchase details modal with print functionality. |
| 87 | [`962656d`](file:///git-commit/962656d) | 2026-03-21 | Robert Hernandez Arenas | :wrench: Implement client profile page with detailed overview, KPIs, and activity timeline, and create sales index page. |
| 88 | [`dcffced`](file:///git-commit/dcffced) | 2026-03-21 | Robert Hernandez Arenas | :wrench: Add debt payment functionality with a new modal component and a corresponding API endpoint. |
| 89 | [`4b5ae81`](file:///git-commit/4b5ae81) | 2026-03-22 | Robert Hernandez Arenas | :wrench: add endpoint to process debt payments, update debt status, and generate Verifactu invoices for fully paid carts. |
| 90 | [`1a19234`](file:///git-commit/1a19234) | 2026-03-22 | Robert Hernandez Arenas | :wrench: introduce client detail page with debt, purchase, and booking modals, and client API endpoint. |
| 91 | [`fe05a56`](file:///git-commit/fe05a56) | 2026-03-22 | Robert Hernandez Arenas | :wrench: add client profile page with overview, booking history, and document management. |
| 92 | [`b3d6270`](file:///git-commit/b3d6270) | 2026-03-22 | Robert Hernandez Arenas | :wrench: introduce agenda views, booking form modal, and API endpoints for comprehensive booking management. |
| 93 | [`e7e5d6e`](file:///git-commit/e7e5d6e) | 2026-03-22 | Robert Hernandez Arenas | :wrench: Implement daily agenda view component and integrate it into the main agenda page with calendar state management. |
| 94 | [`2396a5c`](file:///git-commit/2396a5c) | 2026-03-22 | Robert Hernandez Arenas | :wrench: Implement client profile management with dedicated pages, editable components, and API endpoints for creation and updates. |
| 95 | [`931fe04`](file:///git-commit/931fe04) | 2026-03-23 | Robert Hernandez Arenas | :wrench: Add client profile pages with dedicated components for information, billing, and overview, and implement a new TPV page. |
| 96 | [`0d834c4`](file:///git-commit/0d834c4) | 2026-03-23 | Robert Hernandez Arenas | :wrench: Implement detailed client profile pages with a new API for comprehensive client data, KPI calculations, and modals for managing consents, questionnaires, revokes, and bookings. |
| 97 | [`116f9bd`](file:///git-commit/116f9bd) | 2026-03-23 | Robert Hernandez Arenas | :wrench: Implement client management features including forms, modals, profile views, and related API endpoints. |
| 98 | [`03e9790`](file:///git-commit/03e9790) | 2026-03-23 | Robert Hernandez Arenas | :wrench: Implement initial backend structure with Prisma schema, core API routes, and utilities. |
| 99 | [`fc19787`](file:///git-commit/fc19787) | 2026-03-23 | Robert Hernandez Arenas | :wrench: add Prisma client initialization with MariaDB adapter and connection pooling. |
| 100 | [`691f4c0`](file:///git-commit/691f4c0) | 2026-03-23 | Robert Hernandez Arenas | :construction_worker: rename app.js to server.cjs and update server entry point to .output directory. |
| 101 | [`08b16b9`](file:///git-commit/08b16b9) | 2026-03-24 | Robert Hernandez Arenas | 👷: add postbuild script to copy Prisma files to output directory. |
| 102 | [`6fd7747`](file:///git-commit/6fd7747) | 2026-03-24 | Robert Hernandez Arenas | :wrench: disable sourcemaps for server and client builds and reformat AEAT WSDL URL. |
| 103 | [`006306b`](file:///git-commit/006306b) | 2026-03-24 | Robert Hernandez Arenas | :wrench: add admin user seeding functionality with a new `seed:admin` script. |
| 104 | [`80c7d0a`](file:///git-commit/80c7d0a) | 2026-03-24 | Robert Hernandez Arenas | :wrench: Add initial database schema definition and a script for database health checks. |
| 105 | [`c856aec`](file:///git-commit/c856aec) | 2026-03-24 | Robert Hernandez Arenas | :wrench: Add initial Prisma schema for database models and integrate its generation into build scripts. |
| 106 | [`2cb34df`](file:///git-commit/2cb34df) | 2026-03-24 | Robert Hernandez Arenas | :wrench: implement initial database seeding script to populate users, catalog, and multimedia directories. |
| 107 | [`ed1f38e`](file:///git-commit/ed1f38e) | 2026-03-24 | Robert Hernandez Arenas | :wrench: Implement a new API endpoint for database connection diagnostics. |
| 108 | [`5b07021`](file:///git-commit/5b07021) | 2026-03-27 | Robert Hernandez Arenas | :wrench: Implement login API endpoint and update project dependencies and build configuration. |
| 109 | [`9c7252e`](file:///git-commit/9c7252e) | 2026-03-27 | Robert Hernandez Arenas | :wrench: introduce database seeding scripts for populating and resetting the database. |
| 110 | [`0527b4b`](file:///git-commit/0527b4b) | 2026-04-04 | Robert Hernandez Arenas | :wrench: FEAT: implement sales dashboard with filtering, detail modal, and API integration |
| 111 | [`c36afbf`](file:///git-commit/c36afbf) | 2026-04-04 | Robert Hernandez Arenas | :wrench: FEAT: implement dashboard layout, i18n localization, sales cart API endpoint, and purchase details modal |
| 112 | [`b4cc768`](file:///git-commit/b4cc768) | 2026-04-14 | Robert Hernandez Arenas | :wrench: feat: implement agenda module with multi-view scheduling, booking management, and database schema integration |
| 113 | [`ced1e98`](file:///git-commit/ced1e98) | 2026-04-14 | Robert Hernandez Arenas | :wrench: feat: implement AgendaDayView component with timeline grid and booking management |
| 114 | [`6be0bd0`](file:///git-commit/6be0bd0) | 2026-04-14 | Robert Hernandez Arenas | :wrench: feat: add AgendaDayView component for visualizing daily bookings with timeline and status management |
| 115 | [`6e97afd`](file:///git-commit/6e97afd) | 2026-04-14 | Robert Hernandez Arenas | :wrench: feat: implement AgendaDayView component for visualizing daily bookings with timeline grid and status management |
| 116 | [`1562d84`](file:///git-commit/1562d84) | 2026-04-14 | Robert Hernandez Arenas | :wrench: feat: implement booking API endpoint for retrieval and creation with overlap validation |
| 117 | [`c4a1999`](file:///git-commit/c4a1999) | 2026-04-14 | Robert Hernandez Arenas | :wrench: feat: implement booking API with validation and add test script for reservation management |
| 118 | [`864ddef`](file:///git-commit/864ddef) | 2026-04-14 | Robert Hernandez Arenas | :wrench: feat: add db:push script and automated fix script for missing booking_items table |
| 119 | [`43e717a`](file:///git-commit/43e717a) | 2026-04-14 | Robert Hernandez Arenas | :wrench: add AgendaDayView component for visualizing daily bookings with timeline and status management |
| 120 | [`96483dd`](file:///git-commit/96483dd) | 2026-04-14 | Robert Hernandez Arenas | :wrenc: chore: add .node-version file specifying node version 24 |
| 121 | [`7454272`](file:///git-commit/7454272) | 2026-04-14 | Robert Hernandez Arenas | :wrench: feat: add AgendaDayView component for visualizing daily booking schedules |
| 122 | [`231a2ec`](file:///git-commit/231a2ec) | 2026-04-14 | Robert Hernandez Arenas | :wrench: feat: add AgendaDayView component for visual booking timeline management |
| 123 | [`6a7861a`](file:///git-commit/6a7861a) | 2026-04-14 | Robert Hernandez Arenas | :wrench: feat: add AgendaDayView component for visualizing daily bookings with timeline and status indicators |
| 124 | [`3bdc791`](file:///git-commit/3bdc791) | 2026-04-14 | Robert Hernandez Arenas | :wrench: feat: add AgendaDayView component for visualizing daily bookings with timeline grid and status management |
| 125 | [`4cedfd4`](file:///git-commit/4cedfd4) | 2026-04-14 | Robert Hernandez Arenas | :wrench: feat: implement agenda dashboard page with booking management and details modal |
| 126 | [`975a0f4`](file:///git-commit/975a0f4) | 2026-05-19 | Robert Hernandez Arenas | ♻️ feat: add authentication login component with form validation, GSAP animations, and loading states |
| 127 | [`302c71b`](file:///git-commit/302c71b) | 2026-05-19 | Robert Hernandez Arenas | :wrench: feat: add client profiles, financial management pages, and debt payment API endpoint |
| 128 | [`ebbd1d0`](file:///git-commit/ebbd1d0) | 2026-05-29 | Robert Hernandez Arenas | :wrench: feat: add loading page and introduce plesk-install script to package.json |
| 129 | [`f0402b7`](file:///git-commit/f0402b7) | 2026-05-31 | Robert Hernandez Arenas | :wrench: docs: add comprehensive security hardening and VPS administration guide and update nuxt.config.ts |
| 130 | [`fabebb4`](file:///git-commit/fabebb4) | 2026-05-31 | Robert Hernandez Arenas | :wrench: removed: console.log |
| 131 | [`b8a96ad`](file:///git-commit/b8a96ad) | 2026-05-31 | Robert Hernandez Arenas | removed: codigo interno from service form implemented: codigo interno autogenerated |
| 132 | [`241d89e`](file:///git-commit/241d89e) | 2026-05-31 | Robert Hernandez Arenas | :wrench: fixed: typescript type |
| 133 | [`025815d`](file:///git-commit/025815d) | 2026-06-03 | Robert Hernandez Arenas | :wrench: feat: implement TPV point-of-sale interface with booking integration and checkout management |
| 134 | [`8e5a4a3`](file:///git-commit/8e5a4a3) | 2026-06-03 | Robert Hernandez Arenas | :wrench: feat: implement TPV page with cart management, catalog filtering, and booking integration |
| 135 | [`1f1acbb`](file:///git-commit/1f1acbb) | 2026-07-01 | Robert Hernandez Arenas | :wrench: feat: implement Adapter and Observer patterns, add BookingDetailsModal, TPV page, and supporting API endpoints. |
| 136 | [`8057282`](file:///git-commit/8057282) | 2026-07-01 | Robert Hernandez Arenas | :recycle: Merge branch 'Development' |
| 137 | [`6ac9ac5`](file:///git-commit/6ac9ac5) | 2026-07-06 | Robert Hernandez Arenas | :wrench: feat: implement VeriFactu invoice generation, chaining, and AEAT submission utilities |
| 138 | [`b7a2a0b`](file:///git-commit/b7a2a0b) | 2026-07-06 | Robert Hernandez Arenas | Merge branch 'Development' |
| 139 | [`b70d371`](file:///git-commit/b70d371) | 2026-07-06 | Robert Hernandez Arenas | :wrench: feat: add VeriFactu utilities for atomic invoice numbering, hash chaining, and AEAT submission |
| 140 | [`c982110`](file:///git-commit/c982110) | 2026-07-07 | Robert Hernandez Arenas | :wrench: feat: implement sales dashboard page with analytics and filtering functionality |
| 141 | [`c2f6177`](file:///git-commit/c2f6177) | 2026-07-07 | Robert Hernandez Arenas | :wrench: feat: initialize comprehensive Vue and Pinia best practices knowledge base for agents |
| 142 | [`09319b4`](file:///git-commit/09319b4) | 2026-07-07 | Robert Hernandez Arenas | :wrench: feat: implement sales dashboard with filtering, metrics calculation, and paginated data display |
| 143 | [`0816fb5`](file:///git-commit/0816fb5) | 2026-07-07 | Robert Hernandez Arenas | :wrench: feat: implement product catalog and TPV dashboard modules with integrated UI/UX design system documentation and scaffolding. |
| 144 | [`b68eb5c`](file:///git-commit/b68eb5c) | 2026-07-07 | Robert Hernandez Arenas | :wrench: chore: migrate package.json scripts from pnpm to npm command usage |
| 145 | [`cf98800`](file:///git-commit/cf98800) | 2026-07-07 | Robert Hernandez Arenas | :wrench: feat: add canvas font assets, composition architecture rules, and AgendaGridView component |
| 146 | [`ce5073b`](file:///git-commit/ce5073b) | 2026-07-07 | Robert Hernandez Arenas | :wrench: feat: implement booking form modal and backend infrastructure for sales, clients, and TPV management |
| 147 | [`5fe19d0`](file:///git-commit/5fe19d0) | 2026-07-07 | Robert Hernandez Arenas | :wrench: feat: implement modular agenda system with calendar views, booking management, and state store |
| 148 | [`dc477b0`](file:///git-commit/dc477b0) | 2026-07-07 | Robert Hernandez Arenas | :wrench: feat: add AgendaMonthView component for displaying bookings in a calendar grid |
| 149 | [`b762572`](file:///git-commit/b762572) | 2026-07-07 | Robert Hernandez Arenas | Merge branch 'Development' |
| 150 | [`3451443`](file:///git-commit/3451443) | 2026-07-07 | Robert Hernandez Arenas | :wrench: feat: implement agenda state management, booking drawer component, and client profile page for appointment scheduling |
| 151 | [`a64d1e4`](file:///git-commit/a64d1e4) | 2026-07-07 | Robert Hernandez Arenas | Merge branch 'Development' |
| 152 | [`6096882`](file:///git-commit/6096882) | 2026-07-07 | Robert Hernandez Arenas | :wrench: feat: implement booking management drawer and agenda view integration |
| 153 | [`148ce46`](file:///git-commit/148ce46) | 2026-07-07 | Robert Hernandez Arenas | :wrench: feat: implement agenda page with view switcher, navigation, and modal integration |
| 154 | [`6a15186`](file:///git-commit/6a15186) | 2026-07-07 | Robert Hernandez Arenas | Merge branch 'Development' |
| 155 | [`693e139`](file:///git-commit/693e139) | 2026-07-08 | Robert Hernandez Arenas | :wrench: feat: implement BookingDrawer component for creating and updating agenda appointments with item management support |
| 156 | [`0356f61`](file:///git-commit/0356f61) | 2026-07-08 | Robert Hernandez Arenas | Merge branch 'Development' |
| 157 | [`36d1cf2`](file:///git-commit/36d1cf2) | 2026-07-08 | Robert Hernandez Arenas | :wrench: feat: implement agenda module with sidebar, booking drawer, and calendar views alongside TPV and sales components |
| 158 | [`4cb4584`](file:///git-commit/4cb4584) | 2026-07-09 | Robert Hernandez Arenas | :wrench: feat: implement booking drawer with item management and TPV cart integration for sales processing |
| 159 | [`f6d60af`](file:///git-commit/f6d60af) | 2026-07-09 | Robert Hernandez Arenas | :recycle: refactor: remove development documentation and legacy utility files while introducing BookingDrawer component |
| 160 | [`fedd44a`](file:///git-commit/fedd44a) | 2026-07-17 | Robert Hernandez Arenas | :recycle: refactor: implement purchase modal components, booking form logic, and Prisma database utilities |
| 161 | [`4f3d73e`](file:///git-commit/4f3d73e) | 2026-07-17 | Robert Hernandez Arenas | :recycle: refactor: optimization + memory leak + rate limits |
| 162 | [`a5106f8`](file:///git-commit/a5106f8) | 2026-07-17 | Robert Hernandez Arenas | feat: add AgendaMonthView component and graphify detection scripts |
| 163 | [`ee277f0`](file:///git-commit/ee277f0) | 2026-07-17 | Robert Hernandez Arenas | feat: implement booking form composable and UI components for agenda management |
| 164 | [`7475901`](file:///git-commit/7475901) | 2026-07-17 | Robert Hernandez Arenas | feat: implement client profile management, booking system components, and TPV catalog integration |
| 165 | [`fd8c397`](file:///git-commit/fd8c397) | 2026-07-17 | Robert Hernandez Arenas | :wrench: feat: implement grid and day view components with overlap-aware scheduling logic for the agenda dashboard |
| 166 | [`7206dda`](file:///git-commit/7206dda) | 2026-07-18 | Robert Hernandez Arenas | :wrench: feat: add project development hooks and implement default application layout with sidebar navigation |
| 167 | [`f9b4d1c`](file:///git-commit/f9b4d1c) | 2026-07-18 | Robert Hernandez Arenas | :wrench: feat: implement full Excalidraw MCP server with CLI, frontend, and core canvas management services |
| 168 | [`decf938`](file:///git-commit/decf938) | 2026-07-18 | Robert Hernandez Arenas | :recycle: feat: implement file upload API and scaffold Excalidraw MCP server integration with new UI components removed: multimedia section |
| 169 | [`e85843e`](file:///git-commit/e85843e) | 2026-07-19 | Robert Hernandez Arenas | :wrench: feat: implement Excalidraw MCP server with comprehensive CLI, core canvas utilities, and integrated agenda views |
| 170 | [`c21cccf`](file:///git-commit/c21cccf) | 2026-07-19 | Robert Hernandez Arenas | :wrench: feat: implement Excalidraw MCP server with CLI, core canvas management, and dashboard TPV integration |
| 171 | [`c4ecc7f`](file:///git-commit/c4ecc7f) | 2026-07-19 | Robert Hernandez Arenas | :wrench: feat: integrate Excalidraw MCP server and add new UI components for agenda and search management |
| 172 | [`7d9b8b1`](file:///git-commit/7d9b8b1) | 2026-07-19 | Robert Hernandez Arenas | Merge branch 'Development' |
| 173 | [`88dcac9`](file:///git-commit/88dcac9) | 2026-07-28 | Robert Hernandez Arenas | :wrench: feat: implement Excalidraw MCP server integration and add purchase modal functionality |
| 174 | [`2e5c6bf`](file:///git-commit/2e5c6bf) | 2026-07-28 | Robert Hernandez Arenas | :wrench: feat: added past time bookings |
| 175 | [`a0db7b0`](file:///git-commit/a0db7b0) | 2026-07-28 | Robert Hernandez Arenas | :wrench: feat: no mandatory fields + formating input text |
| 176 | [`1b1f383`](file:///git-commit/1b1f383) | 2026-07-28 | Robert Hernandez Arenas | :wrench: feat: solved refres new client list |
| 177 | [`05cfad7`](file:///git-commit/05cfad7) | 2026-07-28 | Robert Hernandez Arenas | :wrench: feat: integrate Excalidraw MCP server and add TPV catalog components |
| 178 | [`0da7e39`](file:///git-commit/0da7e39) | 2026-07-28 | Robert Hernandez Arenas | :wrench:  feat: fixes about /tpv sections |
| 179 | [`17f1d73`](file:///git-commit/17f1d73) | 2026-07-28 | Robert Hernandez Arenas | :wrench: feat: scaffold core infrastructure |
| 180 | [`1d702e8`](file:///git-commit/1d702e8) | 2026-07-28 | Robert Hernandez Arenas | :wrench: feat: fixed tailwind class |
| 181 | [`fe0672f`](file:///git-commit/fe0672f) | 2026-07-29 | Robert Hernandez Arenas | Merge branch 'Development' |
| 182 | [`fe1f803`](file:///git-commit/fe1f803) | 2026-07-29 | Robert Hernandez Arenas | :wrench: fixed overflow hidden dropdown actions |
| 183 | [`27e372f`](file:///git-commit/27e372f) | 2026-07-29 | Robert Hernandez Arenas | Merge branch 'Development' |
| 184 | [`c7357dc`](file:///git-commit/c7357dc) | 2026-07-31 | Robert Hernandez Arenas | feat(db): resolve Plesk remote connection and add plesk-db skill - Configure Prisma MariaDB pool adapter with allowPublicKeyRetrieval and IPv4 host mapping - Add plesk-db skill for remote database troubleshooting on AlmaLinux/Hostinger - Update client profile page UI with DaisyUI components |
| 185 | [`8634128`](file:///git-commit/8634128) | 2026-07-31 | Robert Hernandez Arenas | perf: eliminate DB polling, parallelize API queries and prevent memory leaks - Remove redundant 3s polling interval on client profile page - Sanitize EditableField date model values to yyyy-MM-dd format - Convert useSync BroadcastChannel to a singleton pattern to prevent memory leaks - Parallelize Prisma queries in client profile and report endpoints using Promise.all |
| 186 | [`67be1df`](file:///git-commit/67be1df) | 2026-07-31 | Robert Hernandez Arenas | perf: eliminate DB polling, parallelize API queries and prevent memory leaks - Remove redundant 3s polling interval on client profile page - Sanitize EditableField date model values to yyyy-MM-dd format - Convert useSync BroadcastChannel to a singleton pattern to prevent memory leaks - Parallelize Prisma queries in client profile and report endpoints using Promise.all - Update graphify knowledge graph AST cache |
| 187 | [`56342b6`](file:///git-commit/56342b6) | 2026-08-01 | Robert Hernandez Arenas | refactor: remove bonus system from database, API and UI |
| 188 | [`2238249`](file:///git-commit/2238249) | 2026-08-01 | Robert Hernandez Arenas | feat(crm): rediseñar detalle de cliente con bento grid analítico 2027 - Clasificar nivel de compromiso en 3 niveles (Bronce, Plata, Oro VIP) - Agregar layout Bento Grid con gráficos ECharts de evolución de gasto y métodos de pago - Añadir selector de período (3M, 6M, 1Y, Todo) para gráfico de gasto temporal - Crear componente ProfileHealthSection para cuestionarios de Indiba y Láser - Crear componente ProfilePackagesSection para seguimiento de paquetes individuales y mixtos - Incorporar tooltips explicativos de DaisyUI en todos los KPIs, métricas y secciones - Actualizar endpoint backend de cliente para calcular tendencias financieras y próximas citas |
| 189 | [`7b73dc9`](file:///git-commit/7b73dc9) | 2026-08-01 | Robert Hernandez Arenas | feat(agenda): reactively compute remaining package sessions and update UI - Sync remaining package sessions counter in real-time with selected booking items - Remove plus icon from "Usar Sesión" button in BookingItemSelector - Display package icon for package items in BookingSelectedItems list |
| 190 | [`3b3ad3b`](file:///git-commit/3b3ad3b) | 2026-08-01 | Robert Hernandez Arenas | feat(packages): add full CRUD for bonus packages and restrict client assignments - Add Package, PackageItem, ClientPackage, ClientPackageItem models to prisma schema - Create DDL migration script for MariaDB (scripts/create-missing-tables.ts) - Add package catalog API endpoints (GET/POST/PUT/DELETE /api/packages) - Add client package assignment API endpoints (GET/POST /api/clients/:id/packages) - Add PackageFormModal and AssignPackageModal components - Fix TPV bonus item removal not reflecting in appointment session count - Fix mixed package type counting products as sessions (only services count) - Fix Error 500 on client profile and packages endpoints with optional chaining - Fix client level thresholds: silver 65-89%, gold-vip ≥90% - Restrict client package assignments to 5 authorized clients only - Update seed-db.ts to target specific clients instead of random mass assignment - Add scripts/sync-exact-client-packages.ts for idempotent DB sync |
| 191 | [`3c8aec2`](file:///git-commit/3c8aec2) | 2026-08-01 | Robert Hernandez Arenas | feat: add catalog page for managing services and packages with associated creation and editing modals |
| 192 | [`458bf1f`](file:///git-commit/458bf1f) | 2026-08-01 | Robert Hernandez Arenas | feat: preselect client when booking appointment from profile Wire the "Agendar Nueva Cita" button on the client profile to handleNewBooking so the appointment drawer preloads the current client instead of falling back to the walk-in placeholder. Fixes the client input not auto-filling on /clientes/:id and removes the now-unused handleEditBooking handler. |
| 193 | [`c42897f`](file:///git-commit/c42897f) | 2026-08-01 | Robert Hernandez Arenas | fix(agenda,ventas): correct client prefill and real-time sales totals |
| 194 | [`f7a05f1`](file:///git-commit/f7a05f1) | 2026-08-01 | Robert Hernandez Arenas | fix(agenda,tpv,ventas): client prefill, real-time sales KPIs, 0€ ticket race |
| 195 | [`f7c10d1`](file:///git-commit/f7c10d1) | 2026-08-01 | Robert Hernandez Arenas | feat(tpv,agenda): sell and redeem bonos/paquetes in TPV and booking modal Add a "Bonos y Paquetes" capability across the sales surfaces: - TPV: new "Bonos" catalog tab to sell packages, plus a "client's bonos"   panel to redeem owned sessions (0 € lines). Checkout requires a   registered client when selling a bono. - Booking modal: new "Vender bono/paquete" selector alongside the existing   owned-bonos consumption banner; sold bonos carry through to the TPV   charge with their catalog price. - Backend (sales/carts): on checkout, create a ClientPackage per sold   package (item_type 'package_sale'), 6-month expiry, requiring a   registered client (400 otherwise). Existing 'package' consumption/   deduction is untouched. Introduces the item_type contract: 'package_sale' (sell, priced, creates ClientPackage) vs 'package' (redeem owned session, 0 €, deducts). |
| 196 | [`ce7ea36`](file:///git-commit/ce7ea36) | 2026-08-02 | Robert Hernandez Arenas | fix(servicios): actions dropdown overlapping package edit modal The Bonos/Paquetes actions menu (Editar/Eliminar) rendered above the package modal because DaisyUI sets z-index:999 on .dropdown-content while PackageFormModal used z-50, and the :focus-within dropdown stayed open on click. Raise the package/assign modals to z-[1000] and blur the focused element (closeMenu) before opening a modal or confirm dialog. |
| 197 | [`59f9614`](file:///git-commit/59f9614) | 2026-08-02 | Robert Hernandez Arenas | fix(servicios): actions dropdown overlapping package edit modal |
| 198 | [`47b1b7c`](file:///git-commit/47b1b7c) | 2026-08-02 | Robert Hernandez Arenas | feat(theme): apply Gogo Admin design system globally via token layer |
| 199 | [`22f57ef`](file:///git-commit/22f57ef) | 2026-08-02 | Robert Hernandez Arenas | feat(ui): themed AppSelect dropdown; replace native payment-method select |
| 200 | [`8418404`](file:///git-commit/8418404) | 2026-08-02 | Robert Hernandez Arenas | feat(settings): pill theme toggle + Appearance & Language in Configuración Add ui/ThemeToggle.vue (neutral-token pill that auto-inverts per theme, animated sun/moon) and use it in the sidebar. Rebuild the Configuración page with working section nav and a Preferencias tab holding two panels: Appearance (theme toggle) and Language (existing LanguageSelector). |
| 201 | [`968a907`](file:///git-commit/968a907) | 2026-08-02 | Robert Hernandez Arenas | refactor(ui): replace native selects with themed AppSelect app-wide |
| 202 | [`a6f3689`](file:///git-commit/a6f3689) | 2026-08-02 | Robert Hernandez Arenas | Merge branch 'Development' |
| 203 | [`2fa0ec0`](file:///git-commit/2fa0ec0) | 2026-08-02 | Robert Hernandez Arenas | feat(clients): appointment history w/ ticket link, smarter search, persisted state |
| 204 | [`4168e7c`](file:///git-commit/4168e7c) | 2026-08-02 | Robert Hernandez Arenas | fix(clients): instant clear (X) button in search — decouple input from debounce The clear button used the debounced ref, so it (and the input) lagged ~500ms and looked missing while typing. Drive the input + clear button from an immediate ref and debounce only the value that hits the API. |
| 205 | [`ba3e82d`](file:///git-commit/ba3e82d) | 2026-08-02 | Robert Hernandez Arenas | Merge branch 'Development' |
| 206 | [`a7275bc`](file:///git-commit/a7275bc) | 2026-08-02 | Robert Hernandez Arenas | feat(clients): make client name inline-editable in profile header |
| 207 | [`4c94afd`](file:///git-commit/4c94afd) | 2026-08-02 | Robert Hernandez Arenas | Merge branch 'Development' |
| 208 | [`bd10684`](file:///git-commit/bd10684) | 2026-08-03 | Robert Hernandez Arenas | feat(sales): retractable edit affordances Purchase detail: move the date edit button next to the input (drop justify-between/w-full) and keep it hover-revealed on desktop, always visible on touch. |
| 209 | [`8f14773`](file:///git-commit/8f14773) | 2026-08-03 | Robert Hernandez Arenas | Merge branch 'Development' |
| 210 | [`b0edaf7`](file:///git-commit/b0edaf7) | 2026-08-03 | Robert Hernandez Arenas | feat(sales): show bonos/paquetes in purchase "Editar compra" add-concept Include /api/packages in the purchase-edit catalog search (mapped as item_type 'package_sale', labeled BONO), so bonos/paquetes appear alongside products and services. Rename "Editar/Editando Ítems" to "Editar/Editando compra". Note: the cart PUT adds the line but does not yet provision the ClientPackage. |
| 211 | [`4791230`](file:///git-commit/4791230) | 2026-08-03 | Robert Hernandez Arenas | feat(sales): show bonos/paquetes in purchase "Editar compra" add-concept Include /api/packages in the purchase-edit catalog search (mapped as item_type 'package_sale', labeled BONO), so bonos/paquetes appear alongside products and services. Rename "Editar/Editando Ítems" to "Editar/Editando compra". Note: the cart PUT adds the line but does not yet provision the ClientPackage. |
| 212 | [`363f6a1`](file:///git-commit/363f6a1) | 2026-08-03 | Robert Hernandez Arenas | Merge branch 'Development' |
| 213 | [`419821c`](file:///git-commit/419821c) | 2026-08-03 | Robert Hernandez Arenas | fix(sales): provision ClientPackage when adding a bono via purchase edit |
| 214 | [`1554dfc`](file:///git-commit/1554dfc) | 2026-08-03 | Robert Hernandez Arenas | Merge branch 'Development' |
| 215 | [`0cd73c2`](file:///git-commit/0cd73c2) | 2026-08-04 | Robert Hernandez Arenas | chore: arreglar toolchain de TypeScript y limpiar lint |
| 216 | [`e475aaf`](file:///git-commit/e475aaf) | 2026-08-04 | Robert Hernandez Arenas | refactor(server): eliminar todos los `any` de la capa de datos (82 -> 0 lint) |
| 217 | [`ac85032`](file:///git-commit/ac85032) | 2026-08-04 | Robert Hernandez Arenas | refactor(app): base de tipos de dominio + stores y printHelpers tipados |
| 218 | [`901a8e3`](file:///git-commit/901a8e3) | 2026-08-04 | Robert Hernandez Arenas | refactor(app): tipar dominio Ventas/TPV (composables + utils) |
| 219 | [`7c92197`](file:///git-commit/7c92197) | 2026-08-04 | Robert Hernandez Arenas | refactor(app): tipar composables restantes (agenda, clientes, utilitarios) |
| 220 | [`7af821f`](file:///git-commit/7af821f) | 2026-08-04 | Robert Hernandez Arenas | types(domain): añadir DTOs de dominio (Debt, Questionnaire, Consent, Revoke, ClientProfile) |
| 221 | [`4887a16`](file:///git-commit/4887a16) | 2026-08-04 | Robert Hernandez Arenas | refactor(app): tipar modales de consent/questionnaire/revoke |
| 222 | [`b6c9040`](file:///git-commit/b6c9040) | 2026-08-04 | Robert Hernandez Arenas | refactor: renombrar DTO Client -> ClientDTO (evitar colisión con global del DOM) |
| 223 | [`60c9558`](file:///git-commit/60c9558) | 2026-08-04 | Robert Hernandez Arenas | refactor(app): tipar agenda (Booking) en vistas Month/Year y componentes |
| 224 | [`2366681`](file:///git-commit/2366681) | 2026-08-04 | Robert Hernandez Arenas | chore(app): quitar imports sin usar en ~30 componentes/páginas |
| 225 | [`6b63601`](file:///git-commit/6b63601) | 2026-08-04 | Robert Hernandez Arenas | chore(app): eliminar variables/parametros/funciones sin usar restantes |
| 226 | [`8bf833c`](file:///git-commit/8bf833c) | 2026-08-05 | Robert Hernandez Arenas | refactor(app): tipar shared/purchase-modal y tpv (Sale, ClientDTO, CatalogItem, IncomingLineItem); unir emits (unified-signatures) |
| 227 | [`945dac1`](file:///git-commit/945dac1) | 2026-08-05 | Robert Hernandez Arenas | refactor(app): tipar form-modals (product/coupon/giftcard/service/user) y ventas/packages |
| 228 | [`428136e`](file:///git-commit/428136e) | 2026-08-05 | Robert Hernandez Arenas | fix(packages): usar CatalogItem (no IPack legacy) en AssignPackageModal; type check verde |
| 229 | [`9cd8949`](file:///git-commit/9cd8949) | 2026-08-05 | Robert Hernandez Arenas | refactor(app): tipar páginas CRUD (consent/questionnaire/revoke/clientes/deudas/servicios/etc.) |
| 230 | [`873b4c5`](file:///git-commit/873b4c5) | 2026-08-05 | Robert Hernandez Arenas | refactor(app): tipar reportes (ReportsOverview) y servicios; type check verde |
| 231 | [`7c00096`](file:///git-commit/7c00096) | 2026-08-05 | Robert Hernandez Arenas | fix(reportes): reordenar interface tras imports (import/first) |
| 232 | [`b6c116e`](file:///git-commit/b6c116e) | 2026-08-05 | Robert Hernandez Arenas | fix(reportes): restaurar interface ReportsOverview tras imports (type check verde) |
| 233 | [`30158f7`](file:///git-commit/30158f7) | 2026-08-05 | Robert Hernandez Arenas | refactor(app): tipar overview y clientes/[id] (Sale/Booking/ClientProfile/ModalRef); type check verde |
| 234 | [`e870d99`](file:///git-commit/e870d99) | 2026-08-05 | Robert Hernandez Arenas | types(domain): enriquecer ClientProfile (kpis, client_bookings, payment_methods) |
| 235 | [`6e2b5b9`](file:///git-commit/6e2b5b9) | 2026-08-05 | Robert Hernandez Arenas | refactor(app): tipar/limpiar misceláneos (ClientChart, Login, AppSelect, error, UserTable v-if-v-for, SalesFilters, aos) |
| 236 | [`8d8f041`](file:///git-commit/8d8f041) | 2026-08-05 | Robert Hernandez Arenas | refactor(agenda): tipar vistas Day/Grid/List (Booking/PositionedBooking) con guardas de layout |
| 237 | [`9b596c4`](file:///git-commit/9b596c4) | 2026-08-05 | Robert Hernandez Arenas | refactor(clients): tipar ClientFormModal y DebtDetailsModal (ClientDTO/Debt/DebtPayment/SaleItem) con guardas |
| 238 | [`fbd7144`](file:///git-commit/fbd7144) | 2026-08-05 | Robert Hernandez Arenas | refactor(agenda): tipar BookingItemSelector (CatalogItem polimórfico) + BookingDrawer; type check verde |
| 239 | [`de99e8e`](file:///git-commit/de99e8e) | 2026-08-05 | Robert Hernandez Arenas | fix(agenda): quitar import BookingItemData sin usar en BookingDrawer |
| 240 | [`39a71e1`](file:///git-commit/39a71e1) | 2026-08-05 | Robert Hernandez Arenas | fix(app): Login catch tipado, LanguageSelector con Ref<string> |
| 241 | [`bd70b4b`](file:///git-commit/bd70b4b) | 2026-08-05 | Robert Hernandez Arenas | refactor(users): UserTable con ClientDTO; unificar UserData->ClientDTO en página usuarios |
| 242 | [`ca7be0c`](file:///git-commit/ca7be0c) | 2026-08-05 | Robert Hernandez Arenas | refactor(clients): tipar componentes de perfil (ClientProfile + kpis analytics) con guardas de plantilla |
| 243 | [`4b6f00e`](file:///git-commit/4b6f00e) | 2026-08-05 | Robert Hernandez Arenas | fix(app): tipar ref-callback en layout; ignorar scripts/seeds (utilidades dev) en ESLint |
| 244 | [`152e694`](file:///git-commit/152e694) | 2026-09-02 | Robert Hernandez Arenas | feat: initialize agent framework with specialized skills and add client profile component |
| 245 | [`5e1e4fe`](file:///git-commit/5e1e4fe) | 2026-09-02 | Robert Hernandez Arenas | feat: add domain DTO interfaces for business entities and client profiles |
| 246 | [`4ad9e00`](file:///git-commit/4ad9e00) | 2026-09-02 | Robert Hernandez Arenas | refactor: migrate agent skills structure, remove legacy documentation, and add ProfileHeader component |
| 247 | [`d6eb37f`](file:///git-commit/d6eb37f) | 2026-09-03 | Robert Hernandez Arenas | feat: consents(LGPD, INDIBA, LAER SHR) + up load files auth + signature + print pdf |
| 248 | [`ce3978e`](file:///git-commit/ce3978e) | 2026-09-04 | Robert Hernandez Arenas | feat: implement agenda system, authentication forms, and core dashboard pages with custom loader component |
| 249 | [`fba32e6`](file:///git-commit/fba32e6) | 2026-09-05 | Robert Hernandez Arenas | feat: implement business intelligence dashboard with real-time analytics reports |
| 250 | [`cba9695`](file:///git-commit/cba9695) | 2026-09-06 | Robert Hernandez Arenas | feat: add UI components, backend utilities, and extensive Vue development guide documentation |
| 251 | [`948f02f`](file:///git-commit/948f02f) | 2026-09-06 | Robert Hernandez Arenas | feat: implement sales export functionality with fiscal calculations, date range utilities, and UI modal |
| 252 | [`9f46148`](file:///git-commit/9f46148) | 2026-09-06 | Robert Hernandez Arenas | feat: implement sales export system with filtering, UI modal, and CSV/PDF generation capabilities |
| 253 | [`a2128e0`](file:///git-commit/a2128e0) | 2026-10-02 | Robert Hernandez Arenas | feat: add executive overview dashboard, client profile components, and supporting API endpoints |
| 254 | [`875ccea`](file:///git-commit/875ccea) | 2026-10-11 | Robert Hernandez Arenas | feat: add client management pages, sales filtering components, and sales composables |
| 255 | [`fa617a5`](file:///git-commit/fa617a5) | 2026-10-11 | Robert Hernandez Arenas | feat: add sales filter calculations, cart API updates, and Verifactu support |
| 256 | [`52f6006`](file:///git-commit/52f6006) | 2026-10-11 | Robert Hernandez Arenas | chore: update project configuration, documentation, and cleanup temporary scripts |
| 257 | [`2a737b1`](file:///git-commit/2a737b1) | 2026-10-11 | Robert Hernandez Arenas | feat: add database connection check script and clean up dependencies |
| 258 | [`7b946f5`](file:///git-commit/7b946f5) | 2026-10-11 | Robert Hernandez Arenas | chore: expand gitignore with patterns for test artifacts, certificates, database dumps, and AI agent configs |
| 259 | [`dd80214`](file:///git-commit/dd80214) | 2026-10-12 | Robert Hernandez Arenas | refactor: remove obsolete database and deployment scripts from package.json scripts |
| 260 | [`b438f4a`](file:///git-commit/b438f4a) | 2026-10-12 | Robert Hernandez Arenas | feat: add VeriFactu integration utilities and ticket migration scripts |
| 261 | [`bd3e56e`](file:///git-commit/bd3e56e) | 2026-10-12 | Robert Hernandez Arenas | feat: add booking and sales API endpoints, composables, and database sync script |
| 262 | [`28cab21`](file:///git-commit/28cab21) | 2026-10-13 | Robert Hernandez Arenas | feat: add comprehensive sales export and ticket numbering migration utilities with UI and tests |
| 263 | [`c0cd2d7`](file:///git-commit/c0cd2d7) | 2026-10-13 | Robert Hernandez Arenas | feat: add SalesMetrics component for displaying sales KPIs and sparklines |
| 264 | [`057f547`](file:///git-commit/057f547) | 2026-10-13 | Robert Hernandez Arenas | feat: set default sales timeframe to historical and add tutorial docs |
| 265 | [`dbc4f49`](file:///git-commit/dbc4f49) | 2026-10-13 | Robert Hernandez Arenas | docs: add ticket migration scripts and step 2 audit procedure to README |
| 266 | [`cc7ae87`](file:///git-commit/cc7ae87) | 2026-10-13 | Robert Hernandez Arenas | docs: add ticket migration tutorial to repository root |
| 267 | [`e42a6d4`](file:///git-commit/e42a6d4) | 2026-10-13 | Robert Hernandez Arenas | feat: add client packages management components, database schema, and API endpoints |
| 268 | [`70cd39d`](file:///git-commit/70cd39d) | 2026-10-13 | Robert Hernandez Arenas | feat: add script and npm command to fix missing database tables and columns |
| 269 | [`121eb4d`](file:///git-commit/121eb4d) | 2026-10-13 | Robert Hernandez Arenas | feat: add database migration script to fix missing tables and columns |
| 270 | [`a4b2777`](file:///git-commit/a4b2777) | 2026-10-25 | Robert Hernandez Arenas | feat: add comprehensive client health and clinical treatment tracking modules |
| 271 | [`e6d1fe8`](file:///git-commit/e6d1fe8) | 2026-10-25 | Robert Hernandez Arenas | feat: add client package sharing system with consumption rules and access control middleware |
| 272 | [`3b21335`](file:///git-commit/3b21335) | 2026-10-25 | Robert Hernandez Arenas | fix(auth): remove hardcoded JWT fallback secret and pin HS256 |
| 273 | [`3a04561`](file:///git-commit/3a04561) | 2026-10-25 | Robert Hernandez Arenas | fix(users): require admin role and strict validation on user management |
| 274 | [`3ea301f`](file:///git-commit/3ea301f) | 2026-10-25 | Robert Hernandez Arenas | fix(auth): block client logins and remove shared default client password |
| 275 | [`9442e4e`](file:///git-commit/9442e4e) | 2026-10-25 | Robert Hernandez Arenas | fix(auth): restrict the API to staff roles and match public routes exactly |
| 276 | [`7a172cd`](file:///git-commit/7a172cd) | 2026-10-25 | Robert Hernandez Arenas | fix(health): restrict health records to admins and make signed consents immutable |
| 277 | [`d9f9dbb`](file:///git-commit/d9f9dbb) | 2026-10-25 | Robert Hernandez Arenas | fix(login): stop storing the password in localStorage |
| 278 | [`a4b7df6`](file:///git-commit/a4b7df6) | 2026-10-25 | Robert Hernandez Arenas | docs: update security status report after phase 1 fixes |
| 279 | [`c494d69`](file:///git-commit/c494d69) | 2026-10-25 | Robert Hernandez Arenas | fix(upload): allow-list destinations and detect file type from content |
| 280 | [`17d3366`](file:///git-commit/17d3366) | 2026-10-25 | Robert Hernandez Arenas | feat(auth): lock accounts after 3 failed login attempts |
| 281 | [`6f7fb24`](file:///git-commit/6f7fb24) | 2026-10-25 | Robert Hernandez Arenas | fix(rate-limit): resolve real client IP behind proxies and add a login limit |
| 282 | [`95a1dda`](file:///git-commit/95a1dda) | 2026-10-25 | Robert Hernandez Arenas | fix(validation): validate catalog and debt input instead of saving raw bodies |
| 283 | [`4612fd8`](file:///git-commit/4612fd8) | 2026-10-25 | Robert Hernandez Arenas | fix(sales): price sale lines from the catalog on the server |
| 284 | [`eb0de02`](file:///git-commit/eb0de02) | 2026-10-25 | Robert Hernandez Arenas | feat(security): send HTTP security headers on every response |
| 285 | [`3b1c5cf`](file:///git-commit/3b1c5cf) | 2026-10-25 | Robert Hernandez Arenas | docs: update security status report after phase 2 fixes |
| 286 | [`3d7e420`](file:///git-commit/3d7e420) | 2026-10-25 | Robert Hernandez Arenas | chore(deps): upgrade to Node 26-compatible stack and remove unused dependencies |
| 287 | [`3eff5d5`](file:///git-commit/3eff5d5) | 2026-10-25 | Robert Hernandez Arenas | docs: update security status report after dependency upgrade |
| 288 | [`e0d222c`](file:///git-commit/e0d222c) | 2026-10-25 | Robert Hernandez Arenas | fix(agenda): remove debug log that wrote request bodies (PII) to a local path |
| 289 | [`6729428`](file:///git-commit/6729428) | 2026-10-25 | Robert Hernandez Arenas | fix(api): stop leaking internal error details in API responses |
| 290 | [`f64ee89`](file:///git-commit/f64ee89) | 2026-10-25 | Robert Hernandez Arenas | fix(packages): scope bono item edits to the bono and validate package input |
| 291 | [`11e3053`](file:///git-commit/11e3053) | 2026-10-25 | Robert Hernandez Arenas | fix(agenda): validate booking updates instead of spreading the request body |
| 292 | [`98c0c86`](file:///git-commit/98c0c86) | 2026-10-25 | Robert Hernandez Arenas | fix(debts): prevent lost updates when two payments hit the same debt |
| 293 | [`d93818c`](file:///git-commit/d93818c) | 2026-10-25 | Robert Hernandez Arenas | fix(verifactu): stop reporting invoices as submitted when nothing was sent |
| 294 | [`aa9bd7b`](file:///git-commit/aa9bd7b) | 2026-10-25 | Robert Hernandez Arenas | fix(ops): bound client list pagination, guard destructive scripts, drop default seed passwords |
| 295 | [`8306c88`](file:///git-commit/8306c88) | 2026-10-25 | Robert Hernandez Arenas | fix(uploads): store uploads privately and serve them only to staff |
| 296 | [`9c4cf47`](file:///git-commit/9c4cf47) | 2026-10-25 | Robert Hernandez Arenas | feat(auth): httpOnly session cookie and server-side session revocation |
| 297 | [`27249da`](file:///git-commit/27249da) | 2026-10-25 | Robert Hernandez Arenas | fix(api): strip internal auth fields from every user response |
| 298 | [`bc42bdd`](file:///git-commit/bc42bdd) | 2026-10-25 | Robert Hernandez Arenas | refactor(api): build public user without dynamic delete (lint) |
| 299 | [`4a1c569`](file:///git-commit/4a1c569) | 2026-10-25 | Robert Hernandez Arenas | docs: update security status report after block A fixes |
| 300 | [`200ae44`](file:///git-commit/200ae44) | 2026-10-25 | Robert Hernandez Arenas | docs: record accepted risk for editable invoiced tickets (F1) |
| 301 | [`eb85240`](file:///git-commit/eb85240) | 2026-10-25 | Robert Hernandez Arenas | fix(privacy): self-host fonts and drop Google Fonts from CSP |
| 302 | [`14629a0`](file:///git-commit/14629a0) | 2026-10-25 | Robert Hernandez Arenas | docs: record self-hosted fonts in status report |


---
*Fin del registro de cambios · Generado de forma integral y estructurada para Beils Belleza Honesta.*
