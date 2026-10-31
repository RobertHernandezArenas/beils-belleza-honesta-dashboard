# Arquitectura del servidor

Guía para leer el backend desde el árbol de carpetas. El código, los identificadores y los comentarios están en inglés; la documentación, en español.

> Estado: **Migración completada al 100%**. La totalidad de los endpoints de la API (`server/api/`) operan bajo arquitectura hexagonal con handlers delgados (HTTP transport), desacoplados de Prisma mediante casos de uso puros y puertos tipados.

## Capas y dirección de dependencias

```
handler  →  caso de uso  →  puerto  ←  adaptador
(HTTP)      (negocio)       (interfaz)  (Prisma / Storage)
```

| Capa | Dónde | Qué hace | Qué NO hace |
|------|-------|----------|-------------|
| Handler | `server/api/...` | Lee la petición (zod, `readBody`, params), comprueba permisos o autenticación, construye las dependencias con los adaptadores, llama al caso de uso y devuelve el resultado. | No contiene reglas de negocio ni consultas directas a base de datos. |
| Caso de uso | `server/modules/<dominio>/<caso>.ts` | Orquesta la regla de negocio y decide el orden de los efectos. Recibe `(deps, input)`. Lanza `createError` con los códigos y mensajes canónicos del dominio. | No importa Prisma ni objetos de petición de h3 (`event`). |
| Puerto | `server/modules/<dominio>/ports.ts` | Interfaces TypeScript puras de lo que el caso de uso necesita (repositorios, unidades de trabajo transaccionales, servicios externos). | No importa Prisma ni h3. |
| Adaptador | `server/modules/<dominio>/prisma-<dominio>-repository.ts` | Implementa el puerto conectando con Prisma, transacciones o servicios de infraestructura. | No contiene decisiones de negocio. |

Regla de oro: las flechas solo apuntan hacia el caso de uso. El caso de uso conoce el puerto; el adaptador conoce el puerto y la infraestructura; nadie del dominio conoce Prisma ni Nitro/h3.

### Transacciones y efectos posteriores

El puerto expone `transaction(work)` y le entrega una *unidad de trabajo* (`SaleUnitOfWork`, `DebtUnitOfWork`, etc.) con las operaciones que deben confirmarse o revertirse juntas. El caso de uso decide qué va dentro. La factura Verifactu/AEAT se emite **después** del commit (`server/modules/shared/invoicing.ts`): si falla, la venta no se revierte y el carrito queda con `aeat_status = 'error'`.

## Mapa de módulos (`server/modules/`)

Todos los dominios del sistema están modularizados bajo la arquitectura hexagonal:

1. **`auth`**: `login.ts`, `get-me.ts`, `ports.ts`, `prisma-auth-repository.ts`.
2. **`users`**: `list-users.ts`, `create-user.ts`, `update-user.ts`, `delete-user.ts`, `unlock-user.ts`, `ports.ts`, `prisma-users-repository.ts`.
3. **`clients`**: `list-clients.ts`, `get-client.ts`, `create-client.ts`, `update-client.ts`, `delete-client.ts`, `get-client-giftcards.ts`, `ports.ts`, `prisma-clients-repository.ts`.
4. **`client-packages`**: `list-client-packages.ts`, `assign-client-package.ts`, `update-client-package.ts`, `delete-client-package.ts`, `share-client-package.ts`, `revoke-client-package-share.ts`, `ports.ts`, `prisma-client-packages-repository.ts`.
5. **`compliance`**: `list-consents.ts`, `create-consent.ts`, `update-consent.ts`, `delete-consent.ts`, `list-questionnaires.ts`, `create-questionnaire.ts`, `update-questionnaire.ts`, `delete-questionnaire.ts`, `list-revokes.ts`, `create-revoke.ts`, `update-revoke.ts`, `delete-revoke.ts`, `ports.ts`, `prisma-compliance-repository.ts`.
6. **`coupons`**: `list-coupons.ts`, `create-coupon.ts`, `update-coupon.ts`, `delete-coupon.ts`, `ports.ts`, `prisma-coupons-repository.ts`.
7. **`catalog`**: `list-products.ts`, `get-product.ts`, `create-product.ts`, `update-product.ts`, `delete-product.ts`, `list-services.ts`, `get-service.ts`, `create-service.ts`, `update-service.ts`, `delete-service.ts`, `ports.ts`, `prisma-catalog-repository.ts`.
8. **`packages`**: `list-packages.ts`, `get-package.ts`, `create-package.ts`, `update-package.ts`, `delete-package.ts`, `ports.ts`, `prisma-packages-repository.ts`.
9. **`treatments`**: `list-zones.ts`, `create-zone.ts`, `delete-zone.ts`, `create-session.ts`, `delete-session.ts`, `ports.ts`, `prisma-treatments-repository.ts`.
10. **`bookings`**: `list-bookings.ts`, `get-booking.ts`, `create-booking.ts`, `update-booking.ts`, `delete-booking.ts`, `ports.ts`, `prisma-bookings-repository.ts`.
11. **`sales`**: `list-carts.ts`, `get-cart.ts`, `create-sale.ts`, `update-cart.ts`, `delete-cart.ts`, `ports.ts`, `prisma-sales-repository.ts`.
12. **`debts`**: `list-debts.ts`, `create-debt.ts`, `get-debt.ts`, `update-debt.ts`, `delete-debt.ts`, `pay-debt.ts`, `list-debt-payments.ts`, `ports.ts`, `prisma-debts-repository.ts`.
13. **`reports`**: `get-reports.ts`, `ports.ts`, `prisma-reports-repository.ts`.
14. **`notifications`**: `get-notification-status.ts`, `ports.ts`, `system-notifications-service.ts`.
15. **`uploads`**: `upload-file.ts`, `ports.ts`, `fs-file-storage-service.ts`.
16. **`shared`**: `invoicing.ts` (emisión segura y desacoplada de facturas Verifactu/AEAT).

## Estructura de pruebas unitarias

Cada dominio cuenta con su suite de tests unitarios ejecutados mediante el Node Test Runner (`tsx --test`), aislados mediante adaptadores y repositorios en memoria (fakes) sin requerir base de datos ni `globalThis`:

- `tests/modules-auth.test.ts`
- `tests/modules-users.test.ts`
- `tests/modules-clients.test.ts`
- `tests/modules-client-packages.test.ts`
- `tests/modules-compliance.test.ts`
- `tests/modules-coupons.test.ts`
- `tests/modules-catalog.test.ts`
- `tests/modules-packages.test.ts`
- `tests/modules-treatments.test.ts`
- `tests/modules-bookings.test.ts`
- `tests/modules-sales.test.ts`
- `tests/modules-debts.test.ts`
- `tests/modules-reports.test.ts`
- `tests/modules-notifications.test.ts`
- `tests/modules-uploads.test.ts`

## Qué se queda en `server/utils` y por qué

`sale-pricing.ts`, `coupons.ts`, `sale-payments.ts`, `debt-payment.ts`, `package-consumption.ts`, `verifactu.ts`, `upload-policy.ts`, `date-range.ts`, etc. son helpers puros o de infraestructura compartida, testeados y reutilizados por múltiples casos de uso. Los casos de uso los importan con rutas relativas (`../../utils/...`).

Nota de auto-imports: Nuxt auto-importa `server/utils`, pero **no** `server/modules`. Dentro de `modules` se utilizan siempre imports relativos explícitos para garantizar desacoplamiento y portabilidad.
