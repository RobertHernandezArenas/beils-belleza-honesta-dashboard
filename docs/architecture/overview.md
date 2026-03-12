# Beils Dashboard - Visión General

## Introducción

**Beils Dashboard (Belleza Honesta)** es un panel de administración Full-Stack diseñado para gestionar todas
las operaciones de un salón de belleza moderno. El sistema cubre desde la gestión de clientes (CRM) y ventas,
hasta un sistema de reservas (Agenda) y facturación integrada con la normativa Veri\*Factu de la AEAT.

El objetivo principal es proporcionar una herramienta robusta, rápida e intuitiva, que centralice todas las
necesidades del negocio bajo una misma plataforma, eliminando la necesidad de múltiples herramientas
desconectadas.

## Tecnologías Principales

El proyecto está construido utilizando un stack tecnológico moderno y eficiente:

### Frontend

- **Framework:** [Nuxt 4](https://nuxt.com/) (Vue 3, Composition API)
- **Gestión de Estado Global:** [Pinia](https://pinia.vuejs.org/)
- **Consumo de Datos (Server State):**
  [TanStack Vue Query v5](https://tanstack.com/query/latest/docs/framework/vue/overview)
- **Estilos y UI:** [TailwindCSS 4](https://tailwindcss.com/) + [DaisyUI](https://daisyui.com/) (Estética
  "Trend UI 2026" con Glassmorphism)
- **Validación:** [Zod](https://zod.dev/)

### Backend

- **Servidor:** Nuxt Server Engine ([Nitro/H3](https://nitro.unjs.io/))
- **ORM:** [Prisma](https://www.prisma.io/)
- **Base de Datos:** MySQL / MariaDB

## Módulos Principales

El sistema se divide en varios módulos core, cada uno documentado en detalle en la sección `features/`:

1. **[CRM (Clientes)](./features/crm.md):** Gestión de usuarios, perfiles de clientes, consentimientos
   médicos/legales y cuestionarios.
2. **[Catálogo](./features/catalog.md):** Inventario de productos, categorías y control de stock.
3. **[Servicios y Packs](./features/services.md):** Definición de los servicios prestados en el salón y
   agrupaciones (packs) de productos y servicios.
4. **[Agenda](./features/agenda.md):** Sistema de reservas unificado, gestión de citas por empleado y vista de
   calendario.
5. **[Marketing](./features/marketing.md):** Creación y seguimiento de cupones de descuento, bonos de sesiones
   y tarjetas regalo (Giftcards).
6. **[TPV/Ventas (Veri\*Factu)](./features/pos_verifactu.md):** Proceso de cobro (carritos), gestión de deudas
   y generación de facturas/tickets cumpliendo con la normativa fiscal española Veri\*Factu.

## Principios Fundamentales

El desarrollo de Beils Dashboard se rige por los siguientes principios:

- **Clean Architecture:** Separación estricta entre la lógica de negocio (Dominio/Aplicación) y la interfaz de
  usuario (Presentación).
- **Accesibilidad (A11y):** Asegurar que la plataforma sea utilizable por todos, siguiendo estándares web
  (ARIA, controles de teclado, contrastes).
- **Rendimiento:** Optimización de renderizado (virtualización para listas largas) y carga de datos eficiente
  mediante caché inteligente (Vue Query).
- **"Honestidad" en el Código:** Código limpio, mantenible (KISS, DRY, SOLID) como reflejo de los valores de
  la empresa "Belleza Honesta".
