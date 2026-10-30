# Arquitectura del servidor

Guía para leer el backend desde el árbol de carpetas. El código, los identificadores y los comentarios están en inglés; la documentación, en español.

> Estado: la migración es **incremental**. Hoy solo dos flujos siguen esta arquitectura (crear venta y cobrar deuda). El resto de endpoints sigue el estilo anterior (ver [Qué falta migrar](#qué-falta-migrar)).

## Capas y dirección de dependencias

```
handler  →  caso de uso  →  puerto  ←  adaptador
(HTTP)      (negocio)       (interfaz)  (Prisma)
```

| Capa | Dónde | Qué hace | Qué NO hace |
|------|-------|----------|-------------|
| Handler | `server/api/...` | Lee la petición (zod, `readBody`, params), comprueba permisos, construye las dependencias con el adaptador Prisma, llama al caso de uso y devuelve el resultado. | No contiene reglas de negocio ni consultas. |
| Caso de uso | `server/modules/<dominio>/<caso>.ts` | Orquesta la regla de negocio y decide el orden de los efectos. Recibe `(deps, input)`. Lanza `createError` con los mismos códigos y mensajes de siempre. | No importa Prisma ni objetos de petición de h3 (`event`). |
| Puerto | `server/modules/<dominio>/ports.ts` | Interfaces TypeScript de lo que el caso de uso necesita (`SalesRepository`, `DebtsRepository`, unidad de trabajo transaccional). | No importa Prisma ni h3. |
| Adaptador | `server/modules/<dominio>/prisma-<dominio>-repository.ts` | Implementa el puerto con el cliente Prisma y su transacción. | No contiene decisiones de negocio. |

Regla de oro: las flechas solo apuntan hacia el caso de uso. El caso de uso conoce el puerto; el adaptador conoce el puerto y Prisma; nadie del dominio conoce Prisma.

### Transacciones y efectos posteriores

El puerto expone `transaction(work)` y le entrega una *unidad de trabajo* (`SaleUnitOfWork`, `DebtUnitOfWork`) con las operaciones que deben confirmarse o revertirse juntas. El caso de uso decide qué va dentro. La factura Verifactu/AEAT se emite **después** del commit (`server/modules/shared/invoicing.ts`): si falla, la venta no se revierte y el carrito queda con `aeat_status = 'error'`.

## Mapa de carpetas

```
server/
├── api/                  # Handlers HTTP finos (rutas de Nitro)
├── middleware/           # Cadena transversal: rate-limit, auth, cabeceras de seguridad
├── plugins/              # Extensiones de Nitro (sanitizado de errores 5xx)
├── modules/              # Casos de uso por dominio (NO se auto-importa)
│   ├── sales/            # create-sale.ts, ports.ts, prisma-sales-repository.ts
│   ├── debts/            # pay-debt.ts, ports.ts, prisma-debts-repository.ts
│   └── shared/           # Piezas comunes a varios casos de uso (emisión de factura)
└── utils/                # Helpers puros y de infraestructura (se auto-importan)
tests/                    # Node Test Runner; los de módulos usan puertos falsos sin globales
```

## Qué se queda en `server/utils` y por qué

`sale-pricing.ts`, `coupons.ts`, `sale-payments.ts`, `debt-payment.ts`, `package-consumption.ts`, `verifactu.ts`, `invoiceGenerators.ts`, etc. son helpers de dominio puros o de infraestructura, ya cubiertos por sus tests y reutilizados por endpoints aún no migrados. Los casos de uso los importan con rutas relativas (`../../utils/...`). Moverlos solo añadiría ruido en el historial sin cambiar el comportamiento.

Nota de auto-imports: Nuxt auto-importa `server/utils`, pero **no** `server/modules`. Dentro de `modules` usa siempre imports relativos explícitos.

## Cómo añadir un caso de uso

1. Crea `server/modules/<dominio>/` si no existe.
2. En `ports.ts`, define las interfaces que necesita el caso de uso (repositorio y, si hay transacción, la unidad de trabajo). Solo TypeScript plano.
3. Escribe `<caso>.ts` con una función exportada `(deps, input)`. `deps` = puertos + reloj `now` (y pasarelas externas si las hay). Usa los helpers de `server/utils` para las reglas ya existentes y `createError` para los errores.
4. Escribe el test en `tests/modules-<dominio>.test.ts` con puertos falsos en memoria (sin `globalThis`, sin Prisma). Primero el test, luego el código.
5. Implementa `prisma-<dominio>-repository.ts`: una función `createPrisma<Dominio>Repository(db)` que recibe el cliente Prisma y devuelve el objeto que cumple el puerto (`satisfies`).
6. Reduce el handler a: parsear la petición, construir las dependencias (`createPrisma...Repository(prisma)`, `now: () => new Date()`), llamar al caso de uso y devolver el resultado.
7. Ejecuta `npm test`, `npm run lint` y `npm run typecheck`.

## Qué falta migrar

Solo se han migrado `POST /api/sales/carts` y `POST /api/debts/[id]/pay`. Los otros 58 endpoints de `server/api` mantienen la lógica en el handler y llaman a Prisma directamente; se migrarán por dominio en pasos posteriores, sin cambiar su comportamiento.
