# Reporte de estado actual — Beils Belleza Honesta Dashboard

**Fecha:** 25/10/2026 · **Alcance:** API (`server/`), frontend (`app/`), esquema Prisma, configuración y dependencias.
**Método:** auditoría de solo lectura del código. Los hallazgos críticos y altos se verificaron manualmente contra el código, y las pruebas de acceso se hicieron con peticiones reales al servidor de desarrollo.

---

## 1. Resumen ejecutivo

| Severidad | Pendientes | Corregidos |
|---|---|---|
| Crítica | **0** | 5 (ventas sin auth + C1, C2, C3, C4) |
| Alta | **7** | 4 (consumo de bonos, A5, J1, J4) |
| Media | **13** | 1 (L2 enumeración en login) |
| Baja | **6** | 4 (A7, J5, L3 en usuarios/clientas, `refresh_token` en respuestas de usuarios) |

> **Actualización 25/10/2026 — Fase 1 completada.** Las críticas están cerradas. Cada corrección tiene tests (suite: 101/101) y está verificada con peticiones reales contra el servidor (ver §2).

**Situación original en una frase:** la API exigía estar logueado, pero **casi nunca verificaba el rol**. Además, los clientes pueden iniciar sesión con una contraseña por defecto que se comparte entre todos. Combinados, cualquiera que conozca el email de una clienta puede convertirse en administrador y leer todo, incluidos los datos de salud.

**Prioridades actuales (Fase 2):**

1. Corregir la subida de archivos (path traversal y extensión arbitraria) → **U1**
2. Limitar los intentos de login a 3, con bloqueo → **L1** (pedido explícito)
3. Validación estricta del input en el resto de endpoints → **V1, V2**
4. Arreglar el rate limit detrás del nginx de Plesk (hoy trata a todos los usuarios como una sola IP)
5. Rotar `JWT_SECRET` a 32 caracteres o más en todos los entornos (en local mide 20; en producción la app ahora no arranca si es más corto)

---

## 2. Corregido en esta sesión

| # | Problema | Corrección | Verificación |
|---|---|---|---|
| ✅ 1 | **`/api/sales/carts` era público.** Sin login se podían leer todas las ventas (con nombre, email y teléfono de clientes), crear ventas, emitir facturas y descontar bonos. | Se quitó de `PUBLIC_ROUTES` en `server/middleware/auth.ts`. Todos los consumidores son `$fetch` del propio navegador, que envían la cookie. | Petición real: antes **200**, ahora **401** en GET, POST y PUT. |
| ✅ 2 | **Consumo de bonos sin control.** En el TPV y en las sesiones de tratamiento se podía descontar el bono de **otra persona**, consumir bonos vencidos, inactivos o **agotados** (la venta salía "cubierta por bono" sin descontar nada), y dos cobros simultáneos podían pisarse. | Regla única en `server/utils/package-sharing.ts` y descuento atómico (`updateMany` condicionado a saldo suficiente) en `server/utils/package-consumption.ts`. Se aplica en las 3 vías del TPV y en `sessions.post.ts`. Si falla, la venta entera se revierte. | 25 tests nuevos (incluido el de carrera: con 1 sesión y 2 consumos simultáneos, uno pasa y el otro recibe 409). La suite completa da 69/69. |
| ✅ 3 | Funcionalidad nueva: **compartir bonos**. | Tabla `client_package_shares` (`npm run db:fix`), endpoints protegidos con `requireAdmin` y validación zod, y UI en la ficha. | Typecheck de app y servidor, lint y compilación de componentes, todo limpio. |

| ✅ 4 | **J1** — Secreto JWT con valor por defecto en el código | `server/utils/jwt-secret.ts`: sin secreto la app no arranca; si es corto, no arranca en producción y avisa en desarrollo. Algoritmo fijado a HS256 (J5). | 4 tests; aviso real en desarrollo · `3b21335` |
| ✅ 5 | **C1, C2** — Escalada a ADMIN mediante `/api/users` | `requireAdmin` + schema zod estricto (`server/utils/user-admin.ts`); sin contraseña por defecto (mínimo 8 caracteres); no se puede borrar a uno mismo ni dejar el sistema sin administradores; bcrypt con costo 12; se ignora el DNI enmascarado (antes se pisaba el real al editar). | 13 tests; 11/11 en vivo: CLIENT/STAFF reciben 403 · `3a04561` |
| ✅ 6 | **C3** — Login de clientas con `beils12345` | Solo ADMIN/STAFF pueden iniciar sesión (`server/utils/login-policy.ts`); las clientas nuevas reciben una contraseña aleatoria inutilizable; respuestas idénticas y bcrypt siempre (L2); sin fuga de errores internos en el login. | 5 tests; en vivo, una clienta real con `beils12345` recibe 401, igual que un email inexistente · `3ea301f` |
| ✅ 7 | **A5, A7** — Tokens CLIENT con acceso a toda la API; rutas públicas por prefijo | El middleware rechaza CLIENT y roles desconocidos en todo `/api`; las rutas públicas son una lista exacta (`server/utils/api-access.ts`). | 9/9 en vivo · `9442e4e` |
| ✅ 8 | **C4** — Datos de salud abiertos | Consentimientos, cuestionarios y revocaciones solo para ADMIN (regla central en el middleware); los consentimientos firmados son inmutables (409); los listados no incluyen la firma. | 10 tests; en vivo, STAFF recibe 403 y un consentimiento firmado real devuelve 409 · `7a172cd` |
| ✅ 9 | **J4** — Contraseña guardada en `localStorage` | "Recordarme" solo guarda el email; al cargar se borra la contraseña guardada por versiones anteriores. | Compila sin errores · `d9f9dbb` |

> El descuento automático del TPV (cuando no se elige un bono) usa **solo bonos propios, activos y vigentes**. Un bono compartido solo se consume si se elige explícitamente.
>
> **Aviso operativo:** los tokens emitidos antes de estas correcciones siguen siendo válidos hasta 24 h, pero un token CLIENT ya no puede usar la API.

---

## 3. Brechas de seguridad pendientes

Formato: **evidencia** (archivo:línea) → **impacto** → **solución**.

### 3.1 Críticas

**✅ RESUELTO (`3a04561`) — C1 — Cualquier usuario logueado puede hacerse ADMIN o tomar cualquier cuenta**
- Evidencia: `server/api/users/[id].put.ts:12` usa `const updateData = { ...body }` y lo pasa directo a `prisma.user.update`. No hay `requireAdmin`.
- Impacto: una cuenta CLIENT envía `{"role":"ADMIN"}` sobre su propio usuario. También puede cambiar la contraseña, el email o el estado de cualquier usuario.
- Solución: agregar `requireAdmin(event)` y un schema zod `.strict()` que solo permita campos editables. `role`, `user_id` y `refresh_token` quedan fuera salvo para ADMIN.

**✅ RESUELTO (`3a04561`) — C2 — Crear y borrar usuarios sin verificar el rol**
- Evidencia: `server/api/users/index.post.ts:18` acepta `role` (incluido `ADMIN`) y `:21` usa la contraseña por defecto `'123456'`. `server/api/users/[id].delete.ts:8` borra sin verificar el rol.
- Impacto: cualquier cuenta logueada crea administradores o borra al personal.
- Solución: `requireAdmin`, contraseña obligatoria y fuerte (sin valor por defecto), y prohibir que alguien se borre a sí mismo o borre al último administrador.

**✅ RESUELTO (`3ea301f`) — C3 — Las clientas pueden iniciar sesión con una contraseña compartida conocida**
- Evidencia: `server/api/clients/index.post.ts:50` hashea `'beils12345'` para **todas** las clientas. `server/api/auth/login.post.ts` nunca verifica el rol antes de emitir el token (`:57`).
- Impacto: con solo el email de una clienta se obtiene un token válido. Encadenado con C1, se convierte en administración total.
- Solución: rechazar el login si `role` no es `ADMIN` o `STAFF`. Asignar a las clientas un hash aleatorio inutilizable. Forzar el cambio de contraseña al personal.

**✅ RESUELTO (`7a172cd`) — C4 — Datos de salud (RGPD art. 9) accesibles para cualquier rol**
- Evidencia: `server/api/clients/consents/index.get.ts:9-16` arma un `where` vacío si no recibe `user_id`, así que devuelve **todos los consentimientos con sus firmas**. Lo mismo pasa en `questionnaires` y `revokes`. Ninguno de los 12 handlers de esas carpetas usa `requireAdmin`. Además, un consentimiento firmado se puede editar o borrar.
- Impacto: descarga masiva de cuestionarios de salud y firmas manuscritas, y alteración de documentos legales.
- Solución: exigir rol de staff, hacer obligatorio `user_id`, excluir `signature_data` de los listados, volver inmutables los consentimientos firmados (corregir con una revocación) y registrar los accesos.

### 3.2 Altas

**✅ RESUELTO para CLIENT (`9442e4e`) — A5 — La mayoría de la API solo exige "estar logueado", sin verificar rol.** Pendiente: separar permisos entre ADMIN y STAFF por recurso (hoy STAFF accede a todo lo que no sea de administración o salud).
- Evidencia: no hay control de rol en el catálogo, servicios, paquetes, agenda (que expone teléfonos y emails), ventas, deudas, reportes, bonos del cliente ni subida de archivos. **45 de 57 archivos de la API** aceptan un token CLIENT.
- Solución: rechazar `CLIENT` en el middleware para todo `/api/*` (salvo `/api/auth/me`) y crear `requireRole(event, ['ADMIN','STAFF'])`. Hoy STAFF no tiene un guard propio, así que en la práctica todo el personal debe ser ADMIN.

**V1 — El body se guarda tal cual en la base de datos (*mass assignment*)**
- Evidencia: `catalog/products/index.ts:43-45` y `catalog/products/[id].ts:26-29` usan `data: body`, igual que `services/[id].ts:26-29`. `agenda/bookings/[id].ts:49,137` usa `{ ...body }` y `sales/debts/index.ts:33-36` usa `{ ...body }`.
- Impacto: se puede escribir cualquier columna (precios, stock, IDs, la clienta de una cita, el `user_id` de una deuda).
- Solución: un schema zod `.strict()` por endpoint, construyendo `data` solo con los campos validados.

**V2 — El precio, la cantidad y el descuento de una venta los decide el navegador**
- Evidencia: `sales/carts/index.ts:85` (`cartData.discount`) y `:100` (`item.quantity * item.unit_price`). El comentario dice "prevent client tampering", pero el precio sale del cliente. Lo mismo ocurre en `sales/carts/[id].ts:55,67`.
- Impacto: ventas con precio, cantidad o descuento negativos o arbitrarios, que además se convierten en facturas.
- Solución: tomar `unit_price` y `tax_rate` del catálogo en el servidor, exigir `quantity` entera ≥ 1 y `0 ≤ discount ≤ subtotal`, y que los descuentos altos solo los pueda aplicar un ADMIN.

**L1 — No hay límite de intentos de login** (pedido: **máximo 3**)
- Evidencia: `server/middleware/rate-limit.ts` aplica un límite global de 100 peticiones por minuto **por IP**, compartido con toda la API. Eso permite unos 144.000 intentos por día por IP. Además el contador vive en memoria (se pierde al reiniciar) y el `Map` nunca se limpia. `login.post.ts` no tiene contador propio, y `User` no tiene campos de bloqueo.
- Diseño propuesto:
  1. Columnas en `User`: `failed_login_count INT DEFAULT 0`, `locked_until DATETIME NULL`.
  2. En el login, si `locked_until > now()` → **423 "Cuenta bloqueada temporalmente"**, sin comparar la contraseña.
  3. Si la contraseña es incorrecta, se incrementa el contador de forma atómica. Al llegar a **3**, se fija `locked_until = now() + 15 min`; en bloqueos sucesivos el tiempo se duplica (15 → 30 → 60 min) y se avisa a un administrador.
  4. Con un login correcto, el contador vuelve a 0 y `locked_until` a NULL.
  5. Además, un límite **por IP solo para `/api/auth/login`** (5 por minuto), guardado en la base de datos o en Redis si hay más de una instancia.
  6. Desbloqueo manual desde Usuarios, solo para ADMIN.
- Tests a escribir primero: el tercer fallo bloquea; un login correcto durante el bloqueo devuelve 423; un acierto resetea el contador; dos fallos simultáneos cuentan los dos.

**✅ RESUELTO (`3b21335`) — J1 — Secreto JWT con un valor por defecto escrito en el código.** Pendiente: rotar el secreto (≥ 32 caracteres).
- Evidencia: `server/utils/jwt.ts:4` usa `process.env.JWT_SECRET || 'super-secret-tp-plus-dashboard'`.
- Impacto: si en algún despliegue falta la variable de entorno, cualquiera puede **fabricar un token de ADMIN** con ese valor, que está en el repositorio.
- Solución: abortar el arranque si `JWT_SECRET` falta o tiene menos de 32 bytes, y rotar el secreto actual.

**✅ RESUELTO (`d9f9dbb`) — J4 — La contraseña se guarda en `localStorage`**
- Evidencia: `app/components/form/Login.vue:105` guarda `btoa(form.password)`. Base64 no es cifrado.
- Impacto: en los equipos compartidos del salón, la contraseña queda legible por cualquier persona, extensión del navegador o ataque XSS.
- Solución: eliminarlo. Recordar solo el email o dejar el recordatorio al gestor de contraseñas del navegador.

**U1 — La subida de archivos permite path traversal y extensiones arbitrarias**
- Evidencia: `server/api/upload.post.ts:36-37` toma `type` y `category` sin sanear. En `:53` se usan en `join(..., 'public','uploads', category, type, ...)`. `:41-43` confía en el MIME que declara el navegador y `:56` conserva la extensión del atacante.
- Impacto: cualquier cuenta logueada escribe archivos `.html`, `.svg` o `.js` fuera de la carpeta prevista. Eso habilita XSS almacenado, que además puede robar el token (ver J3).
- Solución: lista blanca para `category` y `type`; detectar el tipo real por *magic bytes*; aceptar solo jpg, png, webp y pdf; re-codificar las imágenes con sharp; guardar fuera de `public/` y servir los archivos por un endpoint autenticado.

**F1 — Las facturas emitidas se pueden editar, antedatar y borrar**
- Evidencia: `sales/carts/[id].ts:47-50` solo registra un log si la factura ya fue enviada (`submitted`). `:58-60` reescribe las líneas, `:186` acepta cualquier estado, `:195-196` permite cambiar `created_at` y `:233-236` borra sin restricción. `clients/[id].delete.ts:25` borra las facturas de la clienta.
- Impacto: incumple la inmutabilidad exigida por Verifactu (RD 1007/2023): la numeración queda con huecos y los importes dejan de coincidir con el hash.
- Solución: con `invoice_number` asignado, rechazar PUT, DELETE y cambios de fecha; corregir con facturas rectificativas (R1–R5); al borrar una clienta, **anonimizarla** en lugar de eliminar su historial fiscal.

**F2 — El envío a la AEAT se marca como "enviado" aunque no se envía nada**
- Evidencia: `server/utils/aeatSoapClient.ts:12-15` devuelve `true` ("mock") si no hay certificado configurado. El `.env` local no tiene `AEAT_P12_CERT_PATH`, y el XML solo contiene `<Huella>`.
- Impacto: todas las facturas figuran como `submitted` sin haber llegado a Hacienda.
- Solución: estado `not_configured` o `pending_submission`, fallar cerrado en producción, generar un XML RegistroAlta completo y una cola de reintentos.

### 3.3 Medias

| ID | Hallazgo | Evidencia | Solución |
|---|---|---|---|
| A6 | IDOR al editar los ítems de un bono | `clients/[id]/packages/[packageId].put.ts:60-66` actualiza un ítem por ID sin verificar que pertenezca al bono | `updateMany({ where: { client_package_item_id, client_package_id } })` + valores ≥ 0 |
| V3 | Números y fechas sin validar | `packages/index.post.ts:22` (precio negativo o NaN), `clients/[id]/packages.post.ts:28,47`, `sales/debts/[id].ts:30-36` (`remaining` arbitrario) | zod `number().finite().nonnegative()`, `coerce.date()`, enums |
| ✅ L2 | ~~Enumeración de usuarios~~ **Resuelto en `3ea301f`** | `login.post.ts:31-44`: un email inexistente da 401 inmediato, una cuenta inactiva da 403 **antes** de comprobar la contraseña, y hay `console.log('User not found')` | Comparar siempre con bcrypt (usando un hash ficticio), verificar el estado después de la contraseña y devolver un único 401 genérico |
| J2 | Los tokens no se pueden revocar | `jwt.ts:12` 24h; el middleware confía en el rol del token sin consultar la base de datos; el logout solo borra la cookie en el cliente | Token de acceso de 15 min + refresh rotativo, o `token_version` comprobado en el middleware |
| J3 | Cookie de sesión creada por JavaScript (no `httpOnly`) | `app/stores/auth.ts:7-12`; `login.post.ts` devuelve el token en el body | `setCookie` en el servidor con `httpOnly`, `secure` y `sameSite: 'strict'` |
| U2 | Consentimientos y fotos servidos sin autenticación | Los archivos están en `public/uploads/` y `/uploads/*` no pasa por el middleware | Almacenamiento privado y descarga autenticada |
| D1 | Errores internos devueltos al navegador | `login.post.ts:73-76` (`data: error`) y `statusMessage: error.message` en muchos handlers | Mensajes genéricos + log en el servidor + hook de errores de Nitro |
| D2 | Escritura de depuración con datos personales en una ruta local | `agenda/bookings/index.ts:182-192` escribe en `C:/Users/VENOM/.gemini/...` el body y el stack | Eliminar |
| H1 | Sin cabeceras de seguridad | No hay CSP, HSTS, `X-Frame-Options` ni `nosniff` (`nuxt.config.ts`) | `routeRules` con cabeceras, o el módulo `nuxt-security` |
| S1 | Credenciales por defecto en las semillas | `seeds/admin-seed.ts` y `seed-db.ts` usan `password123`; los usuarios `123456`; las clientas `beils12345` | Contraseñas desde variables de entorno o aleatorias, con cambio obligatorio |
| F3/F4 | Encadenado de hashes con condición de carrera y numeración con huecos | `verifactu.ts:44-53` (`findFirst` fuera de transacción, ordenado por un campo editable); `previous_hash` nunca se guarda | Bloquear la secuencia (`FOR UPDATE`) y asignar número, hash y `previous_hash` en la misma transacción; enviar a la AEAT después del commit |
| F5 | Pagos de deuda con condición de carrera; deudas editables por cualquiera | `debts/[id]/pay.post.ts:27-46` (lee y después escribe un valor absoluto); `sales/debts/[id].ts` sin control de rol | Actualización condicionada + `requireAdmin` |
| N1 | **Venta "cubierta por bono" sin bono real** | `sales/carts/index.ts`: si una línea marcada `[SESIÓN BONO]` no encuentra un bono propio usable, la venta sigue igual | Rechazar con 409 o cobrar el precio de catálogo (decisión de negocio pendiente) |

### 3.4 Bajas

- ✅ **A7** (`9442e4e`) — Las rutas públicas se comparan por prefijo (`startsWith`), y `/api/hello` y `/api/test_db` ya no existen. Comparar la ruta exacta y quitar las entradas muertas.
- **V4** — Los strings validados con zod no tienen `.max()` acorde a las columnas `VarChar`. Los cuestionarios aceptan `z.any()`.
- ✅ **L3** (parcial: usuarios y clientas usan costo 12; falta la política de contraseñas en otros flujos) — bcrypt con costo 10, y el servidor no aplica ninguna política de contraseñas. Subir a 12 y exigir longitud mínima.
- ✅ **J5** (`3b21335`) — El algoritmo JWT no está fijado. Usar `algorithms: ['HS256']` + `issuer`/`audience`.
- **X1** — La cookie usa `sameSite: 'lax'` y no se comprueba el `Origin` en las mutaciones.
- **U3** — El tamaño del archivo se valida después de cargarlo entero en memoria.
- **D3** — Hay un ID de clienta real hardcodeado como alias en `clients/[id].get.ts:17` y en la página.
- **H2** — DevTools activadas y un host de ngrok permitido. Nunca exponer el servidor de desarrollo.
- **F6** — Los importes de dinero son `Float`. Pasar a `Decimal(10,2)`.
- El perfil de la clienta devuelve la columna `refresh_token` (hoy sin uso). Excluirla con `select`.

---

## 4. Dependencias

`pnpm audit --prod` reporta **275 avisos** (8 críticos, 109 altos). Los relevantes:

| Paquete | Riesgo | Acción |
|---|---|---|
| `jspdf@4.2.0` | **Crítico**: inyección HTML/objetos PDF | Actualizar |
| `nuxt@4.3.1` | Alto: bypass de middleware de rutas por mayúsculas y caída por memoria sin autenticación | ≥ 4.6 |
| `mariadb@3.5.x` | Alto: expone la contraseña en texto plano ante un MITM | ≥ 3.5.3 |
| `@vue/server-renderer` | Alto: XSS en SSR | vue ≥ 3.5.42 |
| `zod@4.3.6` | Alto: agotamiento de memoria | ≥ 4.6.6 |
| `soap` (axios, xmldom) | Altos: contaminación de prototipos, inyección XML | Actualizar |
| `@nuxt/devtools` | **Crítico** (solo en desarrollo): RPC sin autenticación | No exponer `nuxt dev` |

---

## 5. Puntos a mejorar (no seguridad)

1. **Migraciones:** `client_packages` y otras tablas no están en `prisma/migrations`; se crearon con `db push` y se reparan con `db:fix`. Conviene generar una migración base (`prisma migrate diff`) para que `migrate deploy` reproduzca la base completa.
2. **Tests que no prueban el código real:** `tests/client-packages.test.ts` define sus propios helpers dentro del test en vez de importarlos. Los tests nuevos importan los módulos reales; ese patrón debería extenderse.
3. **Auditoría y RGPD:** no existe un registro de accesos ni de cambios sobre datos de salud y facturas, y los borrados son físicos. Faltan la exportación de datos de la clienta (derecho de acceso) y la anonimización que conserva las facturas.
4. **Scripts destructivos sin protección:** `db:reset-empty` y `db:push` no verifican `NODE_ENV`. No hay copias de seguridad automatizadas en el repo.
5. **Reportes y listados sin límites:** `reports/index.ts` carga todas las ventas dos veces, y `clients/index.get.ts` acepta un `limit` sin tope.
6. **Datos fiscales ficticios:** NIF `00000000T` por defecto y `CIF: B12345678` escrito en los tickets impresos.
7. **Desglose de consumo de bonos:** quedó fuera del alcance de "compartir". Requiere registrar cada consumo (tabla `client_package_usage`), lo que también serviría como auditoría.

---

## 6. Plan de remediación sugerido

| Fase | Contenido | Esfuerzo |
|---|---|---|
| ✅ **1 — Completada (25/10/2026)** | C1, C2, C3, C4, J1, J4, A5 (+ A7, J5, L2 de paso) · commits `3b21335`…`d9f9dbb` | Hecho |
| **2 — Siguiente** | L1 (3 intentos + bloqueo), L2, U1, U2, V1, V2, H1, actualización de dependencias | 3–4 días |
| **3 — Fiscal** | F1–F5, N1, Decimal para dinero | 3–5 días |
| **4 — Madurez** | J2, J3, registro de auditoría, RGPD (exportar y anonimizar), migración base, backups | continuo |

Cada corrección debería empezar con un test que reproduzca la brecha (rojo), igual que en la corrección de bonos de esta sesión.

---

## 7. Matriz de endpoints

**Autenticación:** P = pública · A = cualquier token de staff (ADMIN o STAFF; desde `9442e4e`, CLIENT queda rechazado en toda la API) · R = solo ADMIN.
**Validación:** Y = zod · Parcial · N = ninguna.

| Método + ruta | Auth | Validación | Notas |
|---|---|---|---|
| POST /api/auth/login | P | Y | Sin bloqueo (L1) · ✅ solo staff, sin enumeración |
| GET /api/auth/me | A | – | El único que vuelve a verificar el estado en la base de datos |
| GET/POST /api/agenda/bookings | A | Parcial | Expone teléfonos; log de depuración (D2) |
| GET/PUT/DELETE /api/agenda/bookings/:id | A | N | `...payload` (V1) |
| /api/catalog/products(/:id) | A | N | `data: body` (V1) |
| GET/POST /api/clients | R | Parcial/Y | `limit` sin tope; contraseña `beils12345` (C3) |
| GET/PUT/DELETE /api/clients/:id | R | –/Y/– | DELETE borra facturas (F1) |
| GET /api/clients/:id/packages | A | – | ✅ Propios + compartidos; excluye vencidos |
| POST /api/clients/:id/packages | A | N | NaN en precio y fecha (V3) |
| PUT /api/clients/:id/packages/:packageId | A | N | IDOR de ítems (A6) |
| DELETE /api/clients/:id/packages/:packageId | A | – | Verifica que el bono sea de la clienta |
| ✅ POST /api/clients/:id/packages/:packageId/shares | R | Y | Nuevo: solo la dueña; destinos CLIENT |
| ✅ DELETE /api/clients/:id/packages/:packageId/shares/:userId | R | – | Nuevo: revocar acceso |
| /api/clients/consents·questionnaires·revokes (12) | ✅ R | Y/– | ✅ Solo ADMIN; firmados inmutables |
| POST /api/debts/:id/pay | R | Y | Condición de carrera (F5) |
| /api/packages(/:id) | A | N | Precio negativo o NaN (V3) |
| GET /api/reports | A | Parcial | Ingresos y emails de clientas; consulta pesada |
| ✅ /api/sales/carts(/:id) | A (antes **P**) | N | Precios del cliente (V2); facturas editables (F1); ✅ consumo de bonos atómico |
| /api/sales/debts(/:id) | A | N | `...body` (V1); saldo arbitrario |
| /api/services(/:id) | A | Y/N | PUT con `data: body` |
| ✅ POST /api/treatments/sessions | R | Y | ✅ Bono validado (dueña o beneficiaria) + descuento atómico |
| /api/treatments/zones, sessions/:id | R | Parcial/Y | Sin auditoría |
| POST /api/upload | A | Parcial | **Path traversal (U1)** |
| GET /api/users | R | Parcial | DNI enmascarado |
| POST /api/users | ✅ R | ✅ Y | ✅ Contraseña obligatoria |
| PUT /api/users/:id | ✅ R | ✅ Y (estricto) | ✅ Sin mass assignment |
| DELETE /api/users/:id | ✅ R | – | ✅ No se borra a uno mismo ni al último admin |
| /uploads/* (estático) | P | – | Consentimientos y fotos sin autenticación (U2) |
