# Guía de Backend (Nuxt Nitro)

El backend de Beils Dashboard está embebido directamente dentro de Nuxt usando el poderoso motor Nitro (H3).
Los archivos se alojan en la carpeta `server/`.

## Estructura del Backend

- **`server/api/`:** Contiene los endpoints HTTP de la aplicación (`/api/...`). Estos archivos se asocian a
  rutas basadas en su estructura de carpetas (Ej. `server/api/auth/login.post.ts` crea un endpoint POST en
  `/api/auth/login`).
- **`server/routes/`:** Similares a `api/`, pero se publican en el nivel raíz del dominio en lugar de estar
  bajo el prefijo estricto `/api/`. (Poco usados en este proyecto).
- **`server/middleware/`:** Funciones que se ejecutan secuencialmente _antes_ de que la petición llegue al
  manejador final de la ruta (Ej: Validación de token JWT, comprobación de permisos de Administrador).

## Formato de Endpoints

Un endpoint clásico (`defineEventHandler`) expone una función que recibe un objeto `event` (H3Event). De este
evento podemos sacar el Body, los Query Params, Headers, etc.

Ejemplo simplificado de un endpoint GET (`server/api/users/index.get.ts`):

```ts
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async event => {
	// Extraemos query params de forma segura
	const query = getQuery(event)

	try {
		const users = await prisma.user.findMany({
			where: {
				role: query.role ? String(query.role) : undefined,
			},
		})

		return {
			success: true,
			data: users,
		}
	} catch (error) {
		throw createError({
			statusCode: 500,
			message: 'Error de base de datos interno.',
		})
	}
})
```

---

## Validaciones estrictas: Zod

Es **MANDATORIO** que ninguna variable que el usuario nos envíe (dentro del Body POST o en la URL) toque la
base de datos sin ser previamente validada mediante esquemas de **Zod**.

La estructura correcta para crear algo (ej: `server/api/clients/index.post.ts`):

```ts
import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'

// 1. Definimos y exportamos el Domain Schema
const CreateClientSchema = z.object({
	email: z.string().email('Debe ser un email válido').min(5).max(50),
	name: z.string().min(2, 'El nombre es obligatorio').max(50),
	phone: z.string().min(9).max(20),
})

export default defineEventHandler(async event => {
	// 2. Extraemos el cuerpo de la petición HTTP
	const body = await readBody(event)

	try {
		// 3. Pasamos el cuerpo por el validador Zod y lo parsea
		const validData = CreateClientSchema.parse(body)

		// 4. Si llega aquí, TS sabe que validData está perfectamente tipado y sanitizado
		const newClient = await prisma.user.create({
			data: {
				email: validData.email,
				name: validData.name,
				phone: validData.phone,
				role: 'USER', // Valor por defecto seguro
			},
		})

		return {
			success: true,
			client: newClient,
		}
	} catch (error) {
		// 5. Manejamos errores (ej: Zod devuelve un status HTTP 400 Bad Request si falla)
		if (error instanceof z.ZodError) {
			throw createError({
				statusCode: 400,
				statusMessage: 'Errores de validación',
				data: error.flatten().fieldErrors,
			})
		}
		throw error // Re-lanzamos otro error no anticipado.
	}
})
```

---

## Reglas de Autenticación y Seguridad

Si una ruta del backend expone datos que solo deberían visualizar empleados (Staff) o administradores (Admin),
obligatoriamente debes protegerla utilizando el middleware del lado del servidor.

En Nuxt Nitro, esto se puede hacer mediante utilidades compartidas. Por ejemplo:

```ts
export default defineEventHandler(async event => {
	// 1. Aseguramos sesión
	const userSession = await requireUserSession(event)

	// 2. Comprobamos permisos específicos a nivel de capa superior antes de seguir.
	if (userSession.role !== 'ADMIN') {
		throw createError({
			statusCode: 403,
			statusMessage: 'Acceso Denegado. Se requiere nivel de administrador.',
		})
	}

	// 3. Ejecutar lógica
	// ...
})
```

## Manipulación de Fechas y Monedas

**Regla crítica:** En la base de datos (`Prisma`), y en el backend, las fechas se transportan en objetos puros
JS `Date` (que Prisma traduce nativamente) o strings formato ISO (`YYYY-MM-DDTHH:mm:ss.sssZ`). Los precios se
guardan en variables de punto flotante asumiendo que es la unidad predeterminada (Ej: `15.5` = 15 euros y 50
céntimos).

**Prohibido:** Formatear fechas estéticas o símbolos de monedas (Ej. `"15,50 €"`) desde el backend en una
respuesta JSON. Esto es labor única de la capa de Presentación (Frontend) utilizando `Intl.*`.
