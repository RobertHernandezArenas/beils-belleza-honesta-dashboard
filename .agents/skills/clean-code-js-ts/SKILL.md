---
name: js-ts-clean-code
description: >-
  Escribe, revisa y refactoriza código JavaScript y TypeScript aplicando Clean Code,
  principios SOLID, tipado estricto y tests unitarios. Úsalo siempre que se pida crear,
  revisar, refactorizar, tipar o testear código .js/.jsx/.ts/.tsx, y cuando aparezcan
  términos como "code review", "refactor", "deuda técnica", "code smell", "SOLID",
  "añade tipos", "quita los any", "escribe tests" o "cobertura" — aunque no se mencione
  este skill explícitamente.
argument-hint: "[ruta] [--review | --refactor | --test]"
user-invocable: true
version: 1.0.0
license: MIT
metadata:
  author: RobertHernandezArenas
  category: code-quality
---

# JS/TS Clean Code, SOLID & Testing

Convierte código JavaScript/TypeScript existente o nuevo en código **legible, tipado y
testeado**, reduciendo la deuda técnica sin cambiar el comportamiento observable.

## 1. Cuándo usar este skill

Actívalo para:

- Revisar la calidad de un fichero, módulo o PR (`--review`).
- Refactorizar funciones largas, clases con múltiples responsabilidades o condicionales anidados (`--refactor`).
- Migrar JS a TS, endurecer tipos o eliminar `any` (`--refactor`).
- Escribir o completar tests unitarios (`--test`).

**Cuándo NO usarlo:**

- Configuración de CI/CD, Docker o infraestructura → usa el skill de DevOps.
- Diseño de UI, estilos o accesibilidad → usa el skill de frontend.
- Optimización de rendimiento en runtime (bundle size, renders) → usa el skill de performance.
- Formateo puro (comillas, sangría, punto y coma) → ya lo resuelve Prettier; no lo discutas.

## 2. Prerrequisitos: detecta el stack antes de tocar nada

Antes del primer cambio, inspecciona el repositorio y **adapta los comandos a lo que encuentres**. No inventes scripts que no existan.

1. Lee `package.json` → gestor de paquetes (`packageManager`, lockfile), scripts disponibles, runner de tests.
2. Lee `tsconfig.json` → ¿`strict` activo? ¿`noUncheckedIndexedAccess`? ¿target/module?
3. Comprueba si existe `eslint.config.js` / `.eslintrc*` y `vitest.config.*` / `jest.config.*`.
4. Si falta `strict: true` en `tsconfig.json`, **señálalo en el informe** pero no lo actives de golpe en un repo grande: propón una activación incremental.

## 3. Flujo de trabajo

Ejecuta estos pasos en orden. No avances si el paso anterior no cumple su condición de salida.

1. **Inventariar.** Lee el código objetivo completo. Identifica responsabilidades, dependencias y superficie pública (lo que se exporta).
2. **Diagnosticar.** Lista los *code smells* concretos con ubicación (`fichero:línea`) y la regla violada. Sin diagnóstico no hay refactor.
3. **Establecer red de seguridad.** Si no hay tests que cubran el comportamiento a refactorizar, **escríbelos primero** contra el comportamiento actual. Condición de salida: los tests pasan en verde antes de refactorizar.
4. **Planificar.** Propón los cambios agrupados en pasos pequeños y ordenados por impacto/riesgo. Si el cambio altera la API pública, dilo explícitamente y espera confirmación.
5. **Aplicar.** Un tipo de cambio por commit lógico. Nunca mezcles renombrado masivo con cambio de lógica: hace la revisión imposible.
6. **Verificar.** Ejecuta [`scripts/quality-gate.sh`](./scripts/quality-gate.sh). Condición de salida: lint, typecheck y tests en verde.
7. **Reportar.** Devuelve el resumen con el formato de la sección 8.

## 4. Reglas no negociables

1. **No cambies el comportamiento observable** durante un refactor. Si hace falta corregir un bug, sepáralo y anúncialo.
2. **Nunca borres ni desactives tests** (`.skip`, `.only`, `xit`) para que la suite pase en verde.
3. **Cero `any` nuevo.** Si el tipo es realmente desconocido usa `unknown` y estrecha con guardas de tipo. Un `any` explícito requiere comentario justificando por qué.
4. **Nunca `@ts-ignore` a secas.** Usa `@ts-expect-error` con explicación: falla si el error desaparece, lo que evita supresiones zombis.
5. **No introduzcas dependencias nuevas** sin proponerlo y justificarlo antes.
6. **No dejes `console.log`** en código de producción; usa el logger del proyecto.
7. **No captures errores en silencio.** Un `catch` vacío oculta fallos: relanza, envuelve con contexto o registra.
8. **Mantén la consistencia del repo** por encima de tu preferencia personal: si el proyecto ya usa un patrón coherente, síguelo.

## 5. Convenciones de código

### Nombres

```ts
// ❌ Nombres que obligan a leer la implementación para entenderlos
const d = new Date();
const list = users.filter(u => u.a > 18);
function proc(x) { /* ... */ }

// ✅ El nombre revela la intención; el tipo revela la forma
const createdAt = new Date();
const adultUsers = users.filter(user => user.age >= LEGAL_AGE);
function calculateInvoiceTotal(invoice: Invoice): Money { /* ... */ }
```

- Clases y tipos: `PascalCase`. Funciones y variables: `camelCase`. Constantes de módulo: `UPPER_SNAKE_CASE`.
- Booleanos con prefijo interrogativo: `isActive`, `hasPermission`, `canRetry`.
- Nada de números mágicos: extrae a constante con nombre.

### Funciones

```ts
// ❌ Cuatro argumentos posicionales: imposible recordar el orden
function createUser(name: string, email: string, isAdmin: boolean, notify: boolean) {}
createUser("Ada", "ada@x.com", true, false); // ¿qué significa true, false?

// ✅ Objeto de opciones: legible en el punto de llamada y extensible
interface CreateUserOptions {
  name: string;
  email: string;
  isAdmin?: boolean;
  notify?: boolean;
}
function createUser({ name, email, isAdmin = false, notify = true }: CreateUserOptions) {}
createUser({ name: "Ada", email: "ada@x.com", isAdmin: true, notify: false });
```

- Máximo **3 argumentos posicionales**; a partir de ahí, objeto de opciones.
- Una función hace **una cosa** y está en **un solo nivel de abstracción**.
- Prefiere estilo declarativo (`map`/`filter`/`reduce`) sobre bucles imperativos cuando mejora la legibilidad.
- Evita parámetros booleanos que bifurcan el cuerpo: normalmente esconden dos funciones.

### Guard clauses en vez de anidamiento

```ts
// ❌ Pirámide de la perdición
function processOrder(order: Order) {
  if (order) {
    if (order.items.length > 0) {
      if (order.isPaid) {
        return ship(order);
      }
    }
  }
}

// ✅ Salidas tempranas: el camino feliz queda al final y sin sangrar
function processOrder(order: Order): Shipment {
  if (order.items.length === 0) throw new EmptyOrderError(order.id);
  if (!order.isPaid) throw new UnpaidOrderError(order.id);
  return ship(order);
}
```

### Tipado

```ts
// ❌ any propaga la ausencia de tipos por toda la base de código
function parse(payload: any) {
  return payload.data.items;
}

// ✅ unknown obliga a validar en la frontera
function parse(payload: unknown): Item[] {
  const result = itemsSchema.safeParse(payload);
  if (!result.success) throw new InvalidPayloadError(result.error);
  return result.data;
}
```

- Tipa las **fronteras** (entradas de API, parsing, I/O); dentro, deja inferir a TypeScript.
- Prefiere uniones discriminadas sobre banderas booleanas para modelar estados.
- Usa `readonly` y `as const` para datos que no deben mutar.
- No anotes lo obvio: `const count: number = 0` es ruido.

Detalles ampliados en [referencia de tipado](./references/typescript-types.md).

### Asincronía

- `async/await` sobre cadenas de `.then()`; nunca mezcles ambos en la misma función.
- Nunca llames a un callback asíncrono de forma síncrona: rompe las expectativas de orden.
- Paraleliza con `Promise.all` lo que sea independiente; usa `Promise.allSettled` si los fallos parciales son tolerables.
- Todo `await` en una frontera de I/O necesita una estrategia de error explícita.

### Errores

```ts
// ✅ Errores de dominio tipados, no strings sueltos
class InsufficientFundsError extends Error {
  constructor(readonly accountId: string, readonly missing: number) {
    super(`Account ${accountId} needs ${missing} more units`);
    this.name = "InsufficientFundsError";
  }
}
```

### SOLID

Aplica los cinco principios cuando el diagnóstico lo justifique — no por decreto. Lee [principios SOLID](./references/solid-principles.md) antes de refactorizar clases, servicios o módulos con más de una responsabilidad.

## 6. Tests

Lee [estrategia de testing](./references/testing-strategy.md) antes de escribir el primer test. Resumen operativo:

- Estructura **AAA**: Arrange, Act, Assert, con una línea en blanco entre bloques.
- Un concepto por test. El nombre describe el comportamiento esperado, no el método: `devuelve error cuando el saldo es insuficiente`.
- Tests **FIRST**: rápidos, independientes, repetibles, auto-validables y escritos a tiempo.
- Testea comportamiento público, no detalles de implementación privados.
- Mockea solo las fronteras (red, reloj, sistema de ficheros, base de datos).
- Punto de partida: [`assets/unit-test.template.spec.ts`](./assets/unit-test.template.spec.ts).

## 7. Comandos

```bash
# Puerta de calidad completa (lint + typecheck + tests)
./scripts/quality-gate.sh

# Individualmente, adaptando al gestor de paquetes detectado
npm run lint
npx tsc --noEmit
npm test -- --coverage
```

## 8. Formato de salida

Para `--review` usa **exactamente** esta plantilla:

```markdown
## Resumen
[2–3 frases: estado general y riesgo principal]

## Hallazgos
| Severidad | Ubicación | Smell | Regla | Acción propuesta |
|---|---|---|---|---|
| Alta | order.service.ts:42 | Función de 87 líneas con 4 responsabilidades | SRP | Extraer `validateOrder`, `calculateTotal`, `persist` |

## Refactor propuesto
[Diff o bloques de código con el antes/después de los hallazgos de severidad alta]

## Verificación
- [ ] lint  - [ ] typecheck  - [ ] tests  - [ ] cobertura sin regresión
```

Para `--refactor` y `--test`, entrega el código y cierra con el bloque **Verificación**.

## 9. Ejemplos

**Ejemplo 1 — petición de revisión**

*Entrada:* «revisa `src/services/order.service.ts`»
*Salida esperada:* informe con la plantilla de la sección 8, hallazgos ubicados con `fichero:línea`, sin aplicar cambios todavía.

**Ejemplo 2 — refactor sin red de seguridad**

*Entrada:* «esta función tiene 80 líneas, pártela»
*Salida esperada:* el agente detecta que no hay tests que la cubran, **escribe primero** tests de caracterización contra el comportamiento actual, los pone en verde y solo entonces extrae las funciones.

**Ejemplo 3 — eliminación de `any`**

*Entrada:* «quita los any de este módulo»
*Salida esperada:* `any` → `unknown` con validación en la frontera y tipos derivados hacia dentro; cero `@ts-ignore`; `tsc --noEmit` en verde.

## 10. Recursos

| Recurso | Cuándo leerlo |
|---|---|
| [`references/solid-principles.md`](./references/solid-principles.md) | Antes de refactorizar clases, servicios o módulos con responsabilidades mezcladas |
| [`references/typescript-types.md`](./references/typescript-types.md) | Al tipar fronteras, eliminar `any`, usar genéricos o modificadores de tipo |
| [`references/testing-strategy.md`](./references/testing-strategy.md) | Antes de escribir cualquier test |
| [`assets/unit-test.template.spec.ts`](./assets/unit-test.template.spec.ts) | Como esqueleto de un nuevo fichero de test |
| [`scripts/quality-gate.sh`](./scripts/quality-gate.sh) | En el paso 6 del flujo, siempre antes de reportar |

## 11. Criterios de aceptación

Antes de dar la tarea por terminada, verifica que:

- [ ] Cada hallazgo tiene ubicación concreta y regla asociada
- [ ] El comportamiento observable no ha cambiado (o el cambio se anunció explícitamente)
- [ ] No hay `any` nuevos, `@ts-ignore`, `console.log` ni tests desactivados
- [ ] `lint`, `tsc --noEmit` y la suite de tests pasan
- [ ] La cobertura no ha bajado respecto al punto de partida
- [ ] Los nombres nuevos revelan intención sin necesidad de comentario
- [ ] El informe sigue la plantilla de la sección 8

## 12. Mantenimiento

- **Owner:** equipo de plataforma frontend
- **Versión:** 1.0.0 · **Última revisión:** 2026-08
- **Actualizar cuando:** cambie el runner de tests, se active `strict` globalmente, o se adopte una nueva convención de errores/logging en el repo.
