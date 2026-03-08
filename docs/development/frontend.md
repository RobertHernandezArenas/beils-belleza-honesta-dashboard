# Guía de Frontend (Vue 3 + Nuxt)

El frontend de Beils Dashboard está construido para ser rápido, reactivo y estéticamente impecable ("Trend UI
2026"). Sigue estrictamente estas convenciones.

## Tecnologías Centrales

- **Vue 3 (Composition API):** Obligatorio el uso de `<script setup lang="ts">`. Prohibido el uso de Options
  API.
- **Nuxt 4:** Utilizamos su enrutamiento basado en archivos (`pages/`) y auto-imports (componentes,
  composables, utilidades de Vue). **Regla de oro:** No importes manualmente `ref`, `computed`, `watch`, etc.,
  ya que Nuxt los inyecta automáticamente.
- **State Management:**
   - **Pinia:** Solo para estado verdaderamente global y síncrono (Autenticación del usuario logueado, Carrito
     actual, Configuración del Tema Oscuro/Claro).
   - **TanStack Vue Query:** Obligatorio para **todo el estado del servidor** (Peticiones asíncronas).
- **Estilos:** TailwindCSS 4 complementado con DaisyUI para componentes base rápidos.

---

## TanStack Vue Query (Obligatorio)

Toda comunicación asíncrona con la API debe pasar por Vue Query. Esto nos da de forma gratuita: caché
inteligente, estados de carga (`isLoading`), reintentos automáticos, y deduplicación de peticiones.

### 1. `useQuery` (Lectura de datos)

Para pedir información al servidor (GET).

```ts
// Ejemplo en un composable (ej: composables/useClients.ts)
export const useClients = () => {
	return useQuery({
		queryKey: ['clients'], // Clave única de caché
		queryFn: () => $fetch('/api/users?role=USER'), // endpoint
		staleTime: 60000, // Tiempo antes de considerarse "viejo"
	})
}
```

### 2. `useMutation` (Escritura de datos)

Para enviar información al servidor (POST, PUT, DELETE).

```ts
export const useCreateClient = () => {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (newClient: ClientData) =>
			$fetch('/api/users', {
				method: 'POST',
				body: newClient,
			}),
		onSuccess: () => {
			// Magia: Invalidamos la caché de lectura
			// Esto hace que la tabla de clientes se recargue automáticamente
			queryClient.invalidateQueries({ queryKey: ['clients'] })
			useToast().success('Cliente creado correctamente')
		},
		onError: error => {
			useToast().error(error.data?.message || 'Error al crear cliente')
		},
	})
}
```

---

## Formatos de Componente (`.vue`)

Sigue este estricto orden para todos los archivos `.vue`:

1. `<script setup lang="ts">` (Imports, Props, Emits, Lógica)
2. `<template>` (Markup y Componentes)
3. `<style scoped>` (Preferir clases Tailwind, utilizar style solo si es irremediable)

El código del `<template>` debe ser lo más "tonto" posible. La lógica compleja reside en composables.

### Accesibilidad (A11y - Critical Rule)

Un panel de administración empresarial moderno debe ser accesible:

- **Semántica pura:** Preferir `<button>` en lugar de `<div @click="...">` (El div no recibe el foco del
  teclado).
- **Foco visual:** Elementos interactivos deben ser visibles al navegar con `Tab`. Nunca elimines el anillo de
  enfoque (ej. `outline-none`) sin un reemplazo claro (ej. `focus-visible:ring-2`).
- **Botones sin texto:** Si un botón solo contiene un ícono (ej. una "X" para cerrar un modal o un dibujo de
  papelera), es **obligatorio** que tenga el atributo `aria-label`. Ejemplo:
  `<button aria-label="Eliminar cliente" ...>`.
- **Toasts:** Los mensajes emergentes no intrusivos deben anunciar su llegada a los lectores de pantalla
  usando `aria-live="polite"`.

---

## Convenciones de UI ("Trend UI 2026")

- **Paleta Vercel / Apple:** Tonos neutros precisos: \#ffffff (Blanco puro), \#fbfaf9 (Crema suave), \#1a1a1a
  (Negro texto), variaciones de gris paramétricas (\#8c8c8c, \#bababa).
- **Esqueleto (Skeleton Screens):** Para los estados de `isLoading` de Vue Query, reemplaza toda la tabla o
  formulario temporalmente con cajas grises parpadeantes en lugar de un "Spinner" infinito. Mejora la
  percepción de velocidad.
- **Animaciones Sutiles:**
   - Usa los modificadores `-transition` de Tailwind.
   - **PROHIBIDO:** Usar `transition: all`. Esto acarrea graves problemas de rendimiento en listas largas.
     Declara las propiedades que cambias: `transition-opacity`, ` duration-200 ease-out`.
   - Aplica `touch-action: manipulation` a botones móviles para eliminar el micro-retraso táctil (Double-tap
     delay).
- **Tabular Nums:** En columnas donde haya precios (ej. "25,00 €") o fechas alineadas (ej. "14:30:00"), aplica
  siempre la clase Tailwind `tabular-nums` al contenedor. Esto fuerza caracteres monoespaciados, previniendo
  que la tabla "salte" si los números cambian de ancho.
