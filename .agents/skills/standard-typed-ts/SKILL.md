---
title: Guía de Tipado Estricto en TypeScript
description: Estándares de modelado de dominio, fronteras seguras, uniones discriminadas y configuración estricta.
category: Estándares de Lenguaje & Tipado
version: 1.1.0
last_updated: 2026-09
tags:
  - typescript
  - type-safety
  - clean-code
  - tsconfig
---

# 🛡️ Tipado Estricto en TypeScript

> **Estándar de Ingeniería de Software**  
> Directrices para diseñar sistemas robustos, eliminar la propagación de `any`, modelar estados imposibles como inexpresables y aprovechar la inferencia del compilador. Léela al tipar fronteras de datos, refactorizar tipos o configurar el compilador.

---

## 📑 Tabla de Contenidos

1. [Principio Rector: Tipar Fronteras, Inferir el Interior](#1-principio-rector-tipar-fronteras-inferir-el-interior)
2. [Gestión de Fronteras: any vs. unknown](#2-gestión-de-fronteras-any-vs-unknown)
3. [Modelado de Estado: Uniones Discriminadas y Exhaustividad](#3-modelado-de-estado-uniones-discriminadas-y-exhaustividad)
4. [Estrechamiento (Narrowing) y Guardas de Tipo](#4-estrechamiento-narrowing-y-guardas-de-tipo)
5. [Criterio de Decisión: interface vs. type](#5-criterio-de-decisión-interface-vs-type)
6. [Inmutabilidad y Modificadores de Tipo](#6-inmutabilidad-y-modificadores-de-tipo)
7. [Genéricos Efectivos](#7-genéricos-efectivos)
8. [Configuración Recomendada del Compilador (tsconfig.json)](#8-configuración-recomendada-del-compilador-tsconfigjson)
9. [Checklist de Calidad de Tipado para Code Review](#9-checklist-de-calidad-de-tipado-para-code-review)

---

## 1. Principio Rector: Tipar Fronteras, Inferir el Interior

TypeScript es **JavaScript con un sistema de tipos estructural**: su objetivo es declarar cómo debe comportarse tu código y permitir que el compilador garantice esa invariante. No es una invitación a emular patrones nominales rígidos tipo Java o C#.

### Reglas Operativas Fundamentales
1. **Tipa las fronteras de entrada y salida:** Anota explícitamente parámetros de funciones públicas, retornos de endpoints, entradas de I/O (`localStorage`, `fetch`, `JSON.parse`) y variables de entorno.
2. **Deja trabajar a la inferencia en el cuerpo interno:** Dentro de funciones y métodos, no anotes variables locales cuyo tipo sea deducible por asignación.
3. **No anotes lo obvio:**

```ts
// ❌ Redundante: ruido visual que añade coste de mantenimiento
const count: number = 0;
const names: string[] = [];
const user: User = new User();

// ✅ Limpio: TypeScript infiere el tipo exacto sin sobrecarga
const count = 0;
const names: string[] = []; // o const names = new Array<string>();
const user = new User();
```

---

## 2. Gestión de Fronteras: any vs. unknown

| Tipo | Asignabilidad | Comprobación de Tipo | Seguridad en Runtime |
| :--- | :--- | :--- | :--- |
| **`any`** | Acepta cualquier valor y se asigna a cualquier tipo. | **Desactiva completamente** el verificador de tipos. | Nula. Propaga la ausencia de tipos y pospone fallos a runtime. |
| **`unknown`** | Acepta cualquier valor, pero **no permite operaciones**. | **Exige validación previa** (narrowing o schema parsing). | Máxima. Obliga a garantizar la estructura antes de consumirla. |

### Ejemplo Práctico de Validación en Frontera

```ts
// ❌ Peligro: un error estructural romperá la aplicación capas más abajo
function processResponse(response: any): string[] {
  return response.data.items.map((item: any) => item.name);
}

// ✅ Seguro: la frontera valida con Zod; hacia adentro el código es 100% confiable
import { z } from "zod";

const ResponseSchema = z.object({
  data: z.object({
    items: z.array(z.object({ name: z.string() })),
  }),
});

type ResponsePayload = z.infer<typeof ResponseSchema>;

function processResponse(response: unknown): string[] {
  const result = ResponseSchema.safeParse(response);
  if (!result.success) {
    throw new InvalidPayloadError(result.error);
  }

  return result.data.data.items.map((item) => item.name);
}
```

### Directrices para Casos Especiales

> [!CAUTION]
> Si una librería externa sin tipos te fuerza a usar `any`, aísla el valor de inmediato y documenta la excepción:
> ```ts
> // eslint-disable-next-line @typescript-eslint/no-explicit-any -- SDK legado sin tipos, issue #142
> const untypedClient = createLegacyClient() as any;
> ```

> [!WARNING]
> **Nunca uses `@ts-ignore` sin justificación.** Emplea siempre `@ts-expect-error` acompañado de un comentario explicativo. Si en el futuro una actualización de tipos o dependencias resuelve el error, `@ts-expect-error` fallará la compilación, impidiendo directivas zombies en el código.

---

## 3. Modelado de Estado: Uniones Discriminadas y Exhaustividad

Modela los estados de la aplicación haciendo que los **estados inválidos sean irrepresentables** en el sistema de tipos.

### ❌ Antipatrón: Banderas booleanas y campos opcionales ambiguos
```ts
// ❌ Estados imposibles representables: isLoading: true y error presente al mismo tiempo
interface AsyncState<T> {
  isLoading: boolean;
  data?: T;
  error?: Error;
}
```

### ✅ Solución: Unión discriminada con exhaustividad
```ts
export type AsyncState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: Error };

export function renderUserStatus(state: AsyncState<User>): string {
  switch (state.status) {
    case "idle":
      return "En espera";
    case "loading":
      return "Cargando datos…";
    case "success":
      return `Usuario: ${state.data.name}`; // data garantizada por el compilador
    case "error":
      return `Error: ${state.error.message}`;
    default:
      return assertNever(state); // Garantía de exhaustividad en compilación
  }
}

// Utilidad universal para comprobación de exhaustividad
export function assertNever(value: never): never {
  throw new Error(`Caso no controlado alcanzado: ${JSON.stringify(value)}`);
}
```

> [!TIP]
> Si mañana agregas un nuevo estado a `AsyncState` (ej. `{ status: "cancelled" }`), la función `renderUserStatus` fallará inmediatamente en tiempo de compilación hasta que manejes explícitamente el caso.

---

## 4. Estrechamiento (Narrowing) y Guardas de Tipo

Evita las aserciones ciegas (`as MyType`). Usa mecanismos de estrechamiento verificados:

```ts
export interface User {
  id: string;
  name: string;
}

// Predicado de tipo personalizado (Type Guard)
export function isUser(value: unknown): value is User {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof (value as Record<string, unknown>).id === "string" &&
    "name" in value &&
    typeof (value as Record<string, unknown>).name === "string"
  );
}

// Estrechamiento por typeof, instanceof y operadores in
export function formatInput(input: string | number | Date): string {
  if (typeof input === "string") return input.trim();
  if (input instanceof Date) return input.toISOString();
  return input.toFixed(2);
}
```

> [!WARNING]
> Las aserciones de tipo mediante `as TargetType` silencian al compilador sin validación en tiempo de ejecución. Úsalas únicamente cuando tengas información que el analizador estático no puede deducir, o prefiere librerías de validación como Zod/ArkType.

---

## 5. Criterio de Decisión: interface vs. type

| Característica | `interface` | `type` |
| :--- | :--- | :--- |
| **Definición de objetos/contratos** | Óptimo y extensible. | Completamente soportado. |
| **Declaration Merging** | Soportado (ampliación de tipos en librerías). | No soportado. |
| **Uniones e Intersecciones** | Limitado (requiere `extends`). | Nativo y versátil (`type A = B \| C`). |
| **Tuplas y Primitivas** | No aplicable. | Nativo (`type Pair = [number, string]`). |
| **Rendimiento del compilador** | Ligeramente superior en herencias complejas. | Idéntico en el 99% de los casos. |

### Regla Práctica
- Usa **`interface`** para definir contratos públicos de servicios, repositorios o formas de objetos extensibles en librerías.
- Usa **`type`** para uniones discriminadas, tuplas, funciones puras, alias de tipos primitivos y operaciones de tipos mapeados.
- **Consistencia del repositorio:** Si el proyecto ya sigue una convención uniforme para componentes o entidades, respétala por encima de preferencias individuales.

---

## 6. Inmutabilidad y Modificadores de Tipo

Protege la integridad de los datos en tiempo de compilación y deriva estructuras para evitar duplicidad de fuentes de verdad:

```ts
// 1. readonly: Bloquea mutaciones accidentales en objetos y arrays
export interface ApplicationConfig {
  readonly apiBaseUrl: string;
  readonly maxRetries: number;
  readonly allowedOrigins: readonly string[];
}

// 2. as const: Congela valores literales y deduce tipos exactos
export const USER_ROLES = ["admin", "operator", "viewer"] as const;
export type UserRole = (typeof USER_ROLES)[number]; // "admin" | "operator" | "viewer"

// 3. Utilitarios de derivación: Mantén una única fuente de verdad
export interface Customer {
  id: string;
  name: string;
  email: string;
  hashedPassword: string;
  createdAt: Date;
}

// Derivaciones limpias sin duplicar campos a mano
export type CustomerSummary = Pick<Customer, "id" | "name" | "email">;
export type CustomerCreateInput = Omit<Customer, "id" | "createdAt">;
export type CustomerPatchInput = Partial<CustomerCreateInput>;
export type RolePermissions = Record<UserRole, string[]>;
```

---

## 7. Genéricos Efectivos

> [!IMPORTANT]
> **Regla de Oro de los Genéricos:** Un tipo genérico solo aporta valor si **el tipo fluye desde una entrada hacia una salida** o vincula dos argumentos entre sí.

```ts
// ❌ Antipatrón: Genérico inútil (T aparece una sola vez y no parametriza nada más)
function printItems<T>(items: T[]): void {
  items.forEach((item) => console.log(item));
}

// ✅ Correcto: El tipo de entrada condiciona estrictamente el tipo de salida
function getFirstElement<TElement>(elements: readonly TElement[]): TElement | undefined {
  return elements[0];
}

// ✅ Con restricciones (Type Constraints): Exige una forma mínima garantizada
export function indexByProperty<TEntity extends { id: string }>(
  items: readonly TEntity[],
): Map<string, TEntity> {
  return new Map(items.map((item) => [item.id, item]));
}
```

---

## 8. Configuración Recomendada del Compilador (tsconfig.json)

Asegura que `tsconfig.json` incluya los flags modernos de máxima rigurosidad:

```jsonc
{
  "compilerOptions": {
    /* Verificación de tipos estricta */
    "strict": true,
    "noUncheckedIndexedAccess": true,      // arr[0] devuelve T | undefined
    "exactOptionalPropertyTypes": true,    // Distingue entre ausencia de clave y valor undefined
    "noImplicitOverride": true,            // Exige la palabra clave 'override' en herencia
    "noFallthroughCasesInSwitch": true,    // Evita caídas accidentales en switch

    /* Emisión y módulos modernos */
    "verbatimModuleSyntax": true,          // Claridad estricta entre import/export de tipos y valores
    "isolatedModules": true,               // Compatibilidad garantizada con bundlers como Vite/esbuild
    "skipLibCheck": true                   // Acelera la compilación ignorando tipos de node_modules
  }
}
```

> [!TIP]
> **Estrategia de Migración Incremental en Repositorios Grandes:**  
> Nunca actives `strict: true` de forma global si el proyecto acumula cientos de errores heredados. Habilítalo carpeta por carpeta delimitando el array `"include"` en un `tsconfig` derivado, o añade directivas `// @ts-check` en archivos individuales hasta estabilizar la base de código.

---

## 9. Checklist de Calidad de Tipado para Code Review

Antes de aprobar un cambio o mergear código, verifica:

- [ ] ¿Se eliminaron todos los `any` no documentados sustituyéndolos por `unknown` o tipos concretos?
- [ ] ¿Las entradas externas (API, I/O, eventos) están validadas en la frontera antes de usarse?
- [ ] ¿Los estados asíncronos y flujos complejos se modelan mediante uniones discriminadas con exhaustividad comprobada?
- [ ] ¿Se evitan las aserciones de tipo innecesarias (`as Type`) prefiriendo estrechamiento con guardas o validación?
- [ ] ¿Las constantes literales usan `as const` y los tipos se derivan de una única fuente de verdad?
- [ ] ¿Los genéricos conectan entradas con salidas y evitan la sobreingeniería?
- [ ] ¿El comando `npx tsc --noEmit` pasa en verde sin advertencias?

