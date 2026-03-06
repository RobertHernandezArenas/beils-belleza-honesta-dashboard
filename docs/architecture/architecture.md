# Arquitectura del Proyecto

Beils Dashboard emplea una **Clean Architecture** adaptada al ecosistema de Nuxt 4. Esto garantiza que la
lógica empresarial esté desacoplada del framework de UI, facilitando el mantenimiento y las pruebas.

## Capas de la Arquitectura

### 1. Domain (Dominio)

Define _qué_ hace el sistema. Contiene las entidades, interfaces y reglas de negocio puras.

- **Ubicación:** `types/`, `schemas/`
- **Contenido:** Definiciones de TypeScript e inicialización de esquemas de validación Zod.
- **Regla:** Esta capa no debe depender de ninguna otra capa (Application, Infra, UI).

### 2. Application (Aplicación)

Coordina _cómo_ se ejecutan los casos de uso del dominio.

- **Ubicación:** `stores/`, `composables/`
- **Contenido:**
   - **Stores (Pinia):** Manejan el estado global de la aplicación (Ej: Sesión actual de usuario, preferencias
     de UI).
   - **Composables (Vue):** Orquestan la lógica que conecta la UI con los repositorios (Ej: Un composable para
     el flujo del carrito de compra que interactúa con Vue Query).
- **Regla:** No debe contener HTML ni CSS.

### 3. Infrastructure (Infraestructura)

Implementa los detalles técnicos: conexiones externas, bases de datos o llamadas a APIs.

- **Ubicación (Backend):** `server/api/`, `server/utils/`, Prisma Schema.
- **Ubicación (Frontend):** Funciones o repositorios que utilizan `$fetch` o configuración de Vue Query para
  interactuar con el backend.
- **Regla:** Es la única capa que "conoce" que estamos usando Prisma o haciendo llamadas HTTP específicas.

### 4. Presentation (Presentación)

Es la interfaz web interactiva.

- **Ubicación:** `pages/`, `layouts/`, `components/`
- **Contenido:** Componentes Vue (`.vue`) puramente declarativos.
- **Regla:** La UI no debe contener lógica de negocio compleja. Solo invoca composables o acciones de store, y
  formatea datos para su visualización.

---

## Estructura de Directorios (Nuxt Layers)

Nuxt estructura automáticamente el proyecto en varias capas. Entender esta convención es crucial:

```text
├── app/                  # Frontend de la aplicación (Vue)
│   ├── assets/           # Estilos globales y recursos estáticos
│   ├── components/       # Componentes Vue (UI, Features, Shared)
│   ├── composables/      # Lógica reutilizable (Vue Composition API)
│   ├── layouts/          # Envolturas de UI compartidas (Ej: Default, Auth)
│   ├── middleware/       # Lógica ejecutada antes de las rutas (Ej: auth guard)
│   ├── pages/            # Vistas enrutadas (Vue-router automático)
│   ├── plugins/          # Extensiones de Vue (Ej: Vue Query plugin)
│   └── stores/           # Estado global de Pinia
├── docs/                 # Documentación del proyecto
├── prisma/               # Esquema de la base de datos (Models)
├── server/               # Backend de la aplicación (Nitro/H3)
│   ├── api/              # Endpoints HTTP (rutas del backend)
│   ├── middleware/       # Middleware de servidor (Ej: JWT validation)
│   └── utils/            # Funciones útiles del servidor compartidas
└── public/               # Archivos estáticos servidos desde la raíz
```

### Reglas de Organización de Componentes

La carpeta `components/` debe subdividirse lógicamente para evitar el desorden:

1. **`components/ui/`**: Componentes visuales genéricos, aislados y sin conocimiento de negocio (Botones
   genéricos, Inputs modulares, Modales de base usando DaisyUI).
2. **`components/shared/`**: Componentes reutilizables que sí conocen algo del negocio, pero se usan en
   múltiples partes (Ej: Una _ClientCard_ que se puede usar en la Agenda y en las Ventas).
3. **`components/features/`**: Componentes complejos atados a un contexto de negocio específico (Ej:
   `InventoryTable.vue` dentro de Catálogo, `AppointmentForm.vue` en la Agenda).

### Flujo de Datos Típico (Lectura)

1. El usuario entra en `/clients` (`pages/clients/index.vue`).
2. La página llama a un composable de Application (Ej: `useClients()`).
3. El composable usa TanStack Vue Query (`useQuery`) para hacer un fetch (Infraestructura).
4. La petición golpea `server/api/users/index.ts` en Nuxt Nitro.
5. El handler del servidor usa Prisma (Infraestructura Backend) para consultar la Base de Datos.
6. Los datos vuelven a Vue Query, que los cachea y devuelve a la página.
7. La página se los pasa como props a componentes de UI (Ej: `ClientTable.vue`) para renderizarlos.
