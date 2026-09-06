# 🤖 Sistema de Gobernanza de Agentes (SkillForge Edition)
> **Proyecto:** `beils-belleza-honesta-dashboard`  
> **Autoría Exclusiva:** RobertHernandezArenas  
> **Arquitectura:** Nuxt 4 (App Router), Vue 3 Composition API, TypeScript Strict, Prisma ORM (MariaDB), Tailwind CSS v4, Pinia, Veri*factu.

---

## 🏛️ 1. Misión y Filosofía Arquitectónica
Este repositorio se rige bajo el principio **CONCEPTS > CODE** y **SOLID FOUNDATIONS**:
- Ningún código se escribe sin entender la raíz del problema y sus invariantes de dominio.
- Toda decisión técnica prioriza desacoplamiento, tipado estricto, estabilidad en producción y mantenibilidad a largo plazo.
- Se prohíben estrictamente soluciones apresuradas o parches superficiales.
- **Autoría:** Todo el código, configuración y documentación generada en este proyecto pertenece exclusivamente a **RobertHernandezArenas**. Queda terminantemente prohibida cualquier atribución a entidades externas o co-autorías automáticas ("Co-Authored-By") en commits.

---

## 🔄 2. Orquestación del Ciclo de Vida (`loop`)
Cualquier desarrollo, refactorización o corrección de bugs debe seguir la máquina de estados finitos del SkillPack:

```
   ┌──────────┐
   │   INIT   │
   └────┬─────┘
        │
        ▼
   ┌─────────────────┐       ¿Requisitos ambiguos?
   │  NEEDS_CONTEXT  │ ──────────────────────────► [Grill-Me] Entrevista y clarificación
   └────┬────────────┘
        │ Contexto 100% claro
        ▼
   ┌─────────────────┐
   │    WORKING      │ ──────────────────────────► [Maker] Implementación técnica
   └────┬────────────┘
        │
        ▼
   ┌─────────────────┐       ¿Falla typecheck o tests?
   │   VERIFYING     │ ──────────────────────────► Retorna a WORKING (Max 3 ciclos)
   └────┬────────────┘
        │ Aprobado sin errores
        ▼
   ┌─────────────────┐
   │    LEARNING     │ ──────────────────────────► [Memory] Persistencia en Engram
   └────┬────────────┘
        │
        ▼
   ┌─────────────────┐
   │      DONE       │
   └─────────────────┘
```

---

## 🎭 3. Roles y Especialización de Agentes

### 📋 A. Grill-Me (`.agents/skills/grill_me`)
- **Responsabilidad:** Extracción activa de requisitos críticos antes de escribir código.
- **Cuándo invocar:** Tareas con ambigüedad, cambios en flujos fiscales/legales (ej. ciclos AEAT 20-a-20, Veri*factu), o modificaciones de esquemas de datos.
- **Regla de oro:** Cero asunciones. Si algo no está especificado, se pregunta y valida contra el código existente antes de avanzar.

### 🔨 B. Maker (`.agents/skills/maker`)
- **Responsabilidad:** Ejecución precisa de cambios de código, refactorizaciones y creación de componentes/endpoints.
- **Estándares Mandatorios:**
  1. **TypeScript Estricto (`standard-typed-ts`):** Prohibido el uso de `any`, `unknown` sin type guards, o aserciones inseguras. Modelado de estados imposibles como inexpresables mediante uniones discriminadas.
  2. **Principios SOLID (`solid-principles-js-ts`):** Single Responsibility en componentes Vue, Inversión de Dependencias en servicios, Open/Closed en extensiones de funcionalidad.
  3. **Tailwind CSS Canónico (`tailwind-canonical-classes`):** Prohibidas las combinaciones redundantes (`w-4 h-4` -> `size-4`, `w-full h-full` -> `size-full`, `overflow-hidden overflow-x-auto` -> `overflow-x-auto`).
  4. **Vue 3 / Nuxt 4 Best Practices (`vue-best-practices`):** `<script setup lang="ts">`, reactividad con `ref`/`computed` puros (sin desestructurar refs reactivas).

### 🧪 C. Verifier (`.agents/skills/verifier`)
- **Responsabilidad:** Certificación empírica de calidad antes de dar por completada cualquier tarea.
- **Comprobaciones Obligatorias:**
  - `npx nuxi typecheck`: Cero errores TS (código de salida 0).
  - `pnpm test` / `npx vitest run`: Ejecución de tests unitarios y de integración.
  - Validación de UI: Inspección en navegador o subagente browser cuando aplique a cambios visuales.

### 🧠 D. Memory (`.agents/skills/memory`)
- **Responsabilidad:** Registro persistente del aprendizaje técnico.
- **Disparadores Proactivos:**
  - Tras resolver un bug con causa raíz no trivial (ej. `Property does not exist on type`).
  - Tras adoptar una convención o patrón arquitectónico.
  - Tras implementar una funcionalidad de dominio compleja.

---

## 🛠️ 4. Directivas del Stack Tecnológico

### Nuxt 4 & Directorio `app/`
- Toda la UI reside en `app/` (`app/pages`, `app/components`, `app/composables`, `app/utils`).
- El backend Nitro reside en `server/` (`server/api`, `server/utils`, `server/middleware`).
- Tipos de dominio compartidos residen exclusivamente en `shared/types/domain.ts`.

### Base de Datos & Prisma
- Modelo gestionado en `prisma/schema.prisma`.
- Conexión a MariaDB mediante `@prisma/adapter-mariadb` optimizada para el entorno de producción Plesk.
- Toda mutación que afecte múltiples entidades (ej. sesiones de tratamiento y paquetes de cliente) se ejecuta dentro de transacciones de base de datos (`prisma.$transaction`).

### Estilizado & Tailwind CSS
- Se compila mediante `@tailwindcss/vite` (Tailwind v4).
- Se utiliza DaisyUI 5 para componentes base y tokens de diseño personalizados definidos en `app/assets/css/main.css`.
- Todo componente debe cumplir las normas de clases canónicas para evitar warnings del Language Server.
