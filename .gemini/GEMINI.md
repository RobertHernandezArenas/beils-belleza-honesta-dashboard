# 💎 Beils Dashboard - Manual de Ingeniería

Este documento establece los estándares técnicos, arquitectónicos y éticos para el desarrollo de Beils. La coherencia en el código es lo que permite que el software sea honesto y sostenible.

## 🚀 Stack Tecnológico
- **Framework:** Nuxt 4 (Directory structure & Layers)
- **State Management:** Pinia (Composition API)
- **Data Fetching:** TanStack Vue Query (v5)
- **Validación:** Zod
- **ORM & DB:** Prisma + MySQL
- **Estilos:** TailwindCSS 4 + DaisyUI
- **Package Manager:** PNPM

---

## 🏛️ Arquitectura y Principios de Diseño

### Clean Architecture (Frontend)
El código se organiza para que la lógica de negocio no dependa de la UI:
1.  **Domain:** Interfaces y tipos de Zod en `types/` o `schemas/`.
2.  **Application:** Casos de uso definidos en **Pinia Stores** (estado global) y **Composables**.
3.  **Infrastructure:** Repositorios de datos, configuración de Prisma y servicios de API.
4.  **Presentation:** Componentes de Vue, Pages y Layouts.

### Principios de Código
- **SOLID:** Especial atención a *Single Responsibility*. Si un componente hace más de una cosa, divídelo.
- **KISS (Keep It Simple, Stupid):** No utilices patrones complejos para problemas simples.
- **DRY (Don't Repeat Yourself):** Si una lógica se repite 3 veces, conviértela en un Composable o Utility.
- **Design Patterns:** Uso de *Repository Pattern* para llamadas a la API y *Observer Pattern* mediante el sistema de reactividad de Vue.

---

## 🎨 Gestión de Estado y Datos

### TanStack Vue Query (Data Fetching)
- **Caching:** Usar para todas las peticiones asíncronas.
- **Mutations:** Todas las acciones de escritura (POST/PUT/DELETE) deben pasar por `useMutation` para manejar estados de carga y errores de forma centralizada.
- **Invalidación:** Tras una mutación exitosa, invalidar las queries relacionadas para mantener la UI sincronizada.

### Pinia (Global State)
- Usar **Composition API syntax** (`ref`, `computed`).
- Solo almacenar estado que realmente sea global (Sesión de usuario, preferencias de tema, notificaciones persistentes). La data del servidor vive en Vue Query.

---

## 🎨 Guía de Estilo UI (Vercel Guidelines)

- Paleta de colores: #ffffff - #f2f0eb - #fbfaf9 - #dbd2c6 - #f4f1ee - #1a1a1a - #bababa - #8c8c8c - #666666 - #404040 - #1a1a1a
- Tipografía: ROBOTO CONDENSED + ROBOTO + Arial.
- Iconos: Usar los iconos de Lucide Icons +DaisyUI.
- Componentes: Usar los componentes de DaisyUI + TailwinCSS.

### Accesibilidad (A11y)
- **Semántica:** Usar `<button>`, `<a>`, `<label>` y `<table>` antes de recurrir a ARIA.
- **Interactividad:** Botones de solo icono **deben** incluir `aria-label`.
- **Foco:** Nunca usar `outline-none` sin un reemplazo visual claro (`focus-visible:ring-2`).
- **Anuncios:** Updates asíncronos (toasts) deben usar `aria-live="polite"`.
- **Safe Areas:** Diseños full-bleed deben respetar `env(safe-area-inset-*)`.
- **Async:** Actualizaciones de estado (toasts/validaciones) deben usar `aria-live="polite"`.
- **Touch:** Usar `touch-action: manipulation` para evitar el delay de doble tap en móviles.
- **Reduced Motion:** Respetar `prefers-reduced-motion`.
- **Propiedades:** Animar solo `transform` y `opacity`. **Prohibido** usar `transition: all`; listar propiedades explícitamente.
- **CLS:** Las etiquetas `<img>` deben tener `width` y `height` explícitos.
- **Virtualización:** Listas de >50 elementos deben usar virtualización o `content-visibility: auto`.
- **Widows:** Usar `text-wrap: balance` o `text-pretty` en encabezados.
- **I18n:** Formatear fechas y monedas siempre con `Intl.DateTimeFormat` e `Intl.NumberFormat`.
- **Typography:** Usar `tabular-nums` para columnas de precios o fechas.
- **Z-index:** Usar `z-[1000]` para componentes que requieran estar por encima de otros.
- **Focus:** Usar `focus-visible:ring-2` para componentes que requieran estar por encima de otros.

### Componentización y Orden
- **Ubicación:** - `components/ui/`: Elementos base (Botones, Inputs de DaisyUI).
    - `components/shared/`: Componentes de negocio reutilizables (Citas, Cards de cliente).
    - `components/features/`: Componentes específicos de un módulo (ej. `InventoryTable.vue`).
- **Limpieza:** Los archivos `.vue` deben ser mayoritariamente declarativos. Mover la lógica pesada a `composables/`.
- **Naming:** PascalCase para archivos `.vue` e involucrar el nombre del módulo (ej. `ClientProfileHeader.vue`).
- La estructura de un archivo `.vue` debe ser la siguiente:
    ```vue
    <script setup lang="ts">
    </script>

    <template>
        <div>
            <ClientProfileHeader />
            <ClientProfileContent />
        </div>
    </template>

    <style scoped>
    </style>
    ```
---

## 🧪 Estrategia de Testing
Se utiliza **Vitest** por su integración nativa con Vite/Nuxt.
- **Unit Tests:** Para utilidades y lógica pura en `utils/`.
- **Composable Tests:** Probar la lógica de los stores de Pinia y composables personalizados.
- **Component Tests:** Verificar que la UI reacciona correctamente a los cambios de estado.

---

## 📝 Formas y Contenido
- **Zod:** Todos los inputs del usuario deben validarse con un esquema de Zod antes de enviarse al servidor.
- **Tipografía:** Usar `text-wrap: balance` en títulos y `tabular-nums` para columnas de precios o fechas.
- **Loading:** Los estados de carga deben usar esqueletos (skeletons) consistentes con el diseño de DaisyUI.

---

## 🚫 Anti-patrones (No hacer)
- Usar `transition: all` (especificar propiedades: `transition-opacity`).
- Navegación mediante `div @click` (usar `NuxtLink` o `button`).
- Hardcodear fechas o monedas (usar `Intl.*`).
- Ignorar el modo oscuro (verificar siempre contraste en `dark mode`).
- Evitar realizar imports que Nuxt resuelve por defecto (ej. `import { ref } from 'vue'`).

"La limpieza en el código es el primer paso hacia un servicio honesto." 🌿