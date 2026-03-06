# Beils Dashboard (Belleza Honesta)

Bienvenido al repositorio de **Beils Dashboard**, el panel de administración Full-Stack diseñado para
centralizar y gestionar las operaciones de un salón de belleza moderno.

## 📚 Documentación del Proyecto

El proyecto está extensamente documentado en la carpeta `docs/`. Recomendamos encarecidamente revisar estos
documentos para comprender la arquitectura y las reglas de negocio antes de contribuir.

### Core

- **[Visión General](./docs/architecture/overview.md):** Contexto, objetivos y tecnologías.
- **[Arquitectura](./docs/architecture/architecture.md):** Clean Architecture aplicada a Nuxt 4.
- **[Base de Datos](./docs/architecture/database.md):** Esquema de Prisma y relaciones.
- **[Guía de Frontend](./docs/development/frontend.md):** Vue 3, Pinia, Vue Query, TailwindCSS y
  accesibilidad.
- **[Guía de Backend](./docs/development/backend.md):** Nuxt Nitro (H3), middleware y validaciones seguras.

### Módulos (Features)

- **[CRM (Clientes)](./docs/features/crm.md):** Gestión de usuarios, perfiles, consentimientos.
- **[Catálogo](./docs/features/catalog.md):** Inventario de productos, categorías, etiquetas.
- **[Servicios y Packs](./docs/features/services.md):** Servicios ofertados y empaquetados cruzados.
- **[Agenda y Citas](./docs/features/agenda.md):** Motor de reservas y prevención de solapamientos.
- **[TPV y Facturación](./docs/features/pos.md):** Ventas, carritos, deudas y normativa Veri\*Factu (AEAT).
- **[Marketing](./docs/features/marketing.md):** Cupones de descuento, bonos de sesiones, tarjetas regalo.

---

## 🚀 Setup Inicial

Asegúrate de tener instaladas las dependencias. Recomendamos el uso de `pnpm`:

```bash
pnpm install
```

Configura tus variables de entorno copiando el archivo de ejemplo (si existe) o rellenando el `.env` con las
credenciales de base de datos apropiadas.

Aplica las migraciones de Prisma para preparar tu base de datos:

```bash
pnpm prisma db push
# O en su defecto
pnpm prisma migrate dev
```

Genera el cliente tipado de Prisma:

```bash
pnpm prisma generate
```

## 🛠️ Servidor de Desarrollo

Inicia el servidor en `http://localhost:3000`:

```bash
pnpm dev
```

## 📦 Producción

Construye la aplicación para su despliegue en producción:

```bash
pnpm build
```

Previsualiza localmente el build de producción:

```bash
pnpm preview
```

Consulta la [documentación oficial de despliegue de Nuxt](https://nuxt.com/docs/getting-started/deployment)
para más información técnica de base.
