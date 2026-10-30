# Tutorial: despliegue en Plesk (Phusion Passenger)

Guía paso a paso para publicar Beils Belleza Honesta Dashboard en un servidor con Plesk (Linux) y Node.js.

> **Antes de empezar:** los nombres exactos de los campos del panel de Node.js, y las rutas de Node, cambian según la versión de Plesk. Usá esta guía como referencia y ajustá lo que no coincida con tu panel.

## 0. Requisitos

- Plesk con la extensión **Node.js Toolkit** y acceso **SSH** al dominio.
- **Node 22.22.3+, 24.15+ o 26+**, según el campo `engines` de [package.json](../package.json).
- Una base de datos **MariaDB/MySQL**.
- Desplegar desde `main`: primero se hace el merge de `Development` a `main` (por PR).

## 1. Crear la base de datos

En **Bases de datos → Añadir base de datos**, crear la base y su usuario. Anotar host, puerto, nombre, usuario y contraseña.

## 2. Traer el código

Dos formas:

- **Desde el panel:** **Sitios web y dominios → Git** → repositorio `https://github.com/RobertHernandezArenas/beils-belleza-honesta-dashboard.git`, rama `main`, destino `/httpdocs`.
- **Por SSH:** `git clone -b main <url> ~/httpdocs`.

## 3. Configurar Node.js en el dominio

En **Node.js** del dominio:

| Campo | Valor |
|---|---|
| Versión de Node.js | 22, 24 o 26 |
| Raíz de la aplicación | `/httpdocs` |
| Raíz de documentos | `/httpdocs/.output/public` (ver nota) |
| Modo de aplicación | `production` |
| Archivo de inicio | `server.cjs` |

Activar Node.js, pero **no** usar el botón "NPM install": el proyecto usa **pnpm** y su lockfile.

> **Nota sobre la raíz de documentos:** es la carpeta de estáticos que genera `pnpm build`. Comprobá que exista después del paso 5. Si Plesk no la acepta, dejá la raíz por defecto: Nitro también sirve esos archivos desde la aplicación.

`server.cjs` es el puente que carga la salida compilada (`.output/server/index.mjs`), según [server.cjs](../server.cjs).

## 4. Crear el `.env` en el servidor

Crearlo en `/httpdocs/.env`. **Nunca** subirlo al repositorio.

```ini
NODE_ENV=production
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_NAME=...
DATABASE_USER=...
DATABASE_PASSWORD=...
JWT_SECRET=<cadena aleatoria larga>
SALON_NIF=...
SALON_NAME=Beils Belleza Honesta
SALON_ADDRESS=...
SALON_PHONE=...
SMTP_HOST=...
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=...
SMTP_PASS=...
MAIL_FROM="Beils Belleza Honesta <...>"
UPLOADS_DIR=/var/www/vhosts/<tu-dominio>/private/uploads
TRUSTED_PROXY_HOPS=1
```

- **`JWT_SECRET` es obligatorio en producción:** sin él, la app no arranca (ver [jwt-secret.ts](../server/utils/jwt-secret.ts)).
- Generarlo con: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`.
- **`UPLOADS_DIR`** va fuera de `httpdocs`, para que los documentos y fotos de los clientes no sean públicos.
- **`TRUSTED_PROXY_HOPS=1`:** la app queda detrás del proxy de Plesk.

### Importante: cuándo se leen las variables

- Las variables de **base de datos**, `JWT_SECRET`, `UPLOADS_DIR` y `TRUSTED_PROXY_HOPS` se leen **en tiempo de ejecución** desde `.env`.
- Las variables `SMTP_*`, `MAIL_FROM` y `SALON_*` se leen **al compilar**, porque [nuxt.config.ts](../nuxt.config.ts) las incluye en `runtimeConfig`. El servidor compilado no vuelve a leer el `.env` para ellas.

Si cambiás alguna de ese segundo grupo, tenés dos caminos:

1. Volver a compilar (paso 5).
2. Definirla en **Node.js → Variables de entorno personalizadas** con el prefijo de Nuxt: `NUXT_SMTP_HOST`, `NUXT_SMTP_PASS`, etc. Las que se imprimen en el ticket (datos del salón) usan además `NUXT_PUBLIC_`, por ejemplo `NUXT_PUBLIC_SALON_PHONE`.

## 5. Instalar y compilar (SSH)

```bash
cd ~/httpdocs
export PATH=<ruta-a-node-de-tu-version>/bin:$PATH   # ej.: /opt/plesk/node/24/bin, según tu panel
corepack enable                                     # o: npm i -g pnpm
pnpm install --frozen-lockfile
pnpm build                                          # incluye prisma generate
```

En un VPS pequeño, el build puede quedarse sin memoria. En ese caso:

```bash
NODE_OPTIONS=--max-old-space-size=2048 pnpm build
```

## 6. Base de datos

**Base nueva:**

```bash
pnpm db:push        # crea todo el esquema
pnpm seed:admin     # crea el admin y muestra una contraseña aleatoria UNA sola vez
```

**Base existente (en cada despliegue):**

```bash
pnpm db:fix                   # agrega lo nuevo: cupones, descuentos, payment_breakdown
```

> **Importante:** correr `db:fix` **antes** de reiniciar la aplicación. Si arranca el código nuevo contra la base vieja, **fallan todas las ventas**.

**Migraciones puntuales (no en cada despliegue):** solo si la auditoría lo indica. Hacé siempre un **respaldo completo** antes.

1. **Uploads viejos en `public/uploads`:** simular con `pnpm uploads:migrate`. Si la simulación lista archivos, aplicar con `pnpm uploads:migrate:apply`. Si no hay nada, no hace falta.
2. **Numeración de tickets:** auditar con `pnpm tickets:verify`. Si reporta saltos o duplicados:
   ```bash
   pnpm tickets:migrate          # simulación: no cambia nada
   pnpm tickets:migrate:apply    # solo después de revisar la simulación
   ```
3. **Citas cobradas sin venta (huérfanas):** si la auditoría lo indica, `pnpm tickets:sync-agenda` simula y `pnpm tickets:sync-agenda:apply` aplica.

Ver [docs/tutorial-migracion-tickets.md](tutorial-migracion-tickets.md) para el procedimiento detallado de la numeración.

## 7. Arrancar

- Pulsar **Reiniciar aplicación** en el panel de Node.js, o ejecutar:
  ```bash
  mkdir -p tmp && touch tmp/restart.txt
  ```
- Activar **SSL/TLS → Let's Encrypt** y **Redirigir HTTP a HTTPS**. La cookie de sesión es httpOnly y necesita HTTPS.

## 8. Comprobar

1. Entrar con el admin y rotar la contraseña: `pnpm admin:reset-password <email>`.
2. Hacer una venta de prueba en el TPV con un cupón, e imprimir el ticket y la factura.
3. Crear una cita para un cliente con tu email y confirmar que llega el correo.
4. Si algo falla, revisar los **Registros** del dominio en Plesk.

## Cada actualización

```bash
cd ~/httpdocs
git pull
pnpm install --frozen-lockfile
pnpm build
pnpm db:fix
touch tmp/restart.txt
```

## Problemas frecuentes

| Síntoma | Causa probable |
|---|---|
| La app no arranca y el log dice que falta `JWT_SECRET` | No se definió en `.env` (paso 4). |
| Las ventas fallan con error de columna desconocida | Se reinició sin correr `pnpm db:fix`. |
| El correo no sale, pero las citas se guardan | Revisar `SMTP_*` y que el valor se haya compilado o definido como `NUXT_SMTP_*` (ver paso 4). |
| El ticket muestra datos viejos del salón | `SALON_*` cambió sin recompilar: usar `NUXT_PUBLIC_SALON_*` o recompilar. |
| Falla `pnpm build` por memoria | Usar `NODE_OPTIONS=--max-old-space-size=2048`. |
